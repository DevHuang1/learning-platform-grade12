import { after, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import {
  answerProcessorModelName,
  processAnswerWithHuggingFace,
} from "@/lib/answer-processing";

export const runtime = "nodejs";
export const maxDuration = 120;

type AnswerContext = {
  id: number;
  submission_id: number;
  question_id: number;
  text_answer: string | null;
  image_path: string | null;
  image_url: string | null;
  file_path: string | null;
  file_url: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: number | null;
  submission: {
    id: number;
    user_id: string | null;
  } | null;
  question: {
    id: number;
    prompt: string;
    answer_guide: string;
    marks: number;
  } | null;
};

function inferMimeType(fileName: string | null) {
  if (!fileName) return "application/octet-stream";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function processAnswer(answer: AnswerContext, reviewId: number) {
  const admin = createAdminSupabase();
  try {
    let fileBytes: Uint8Array | null = null;
    const filePath = answer.file_path || answer.image_path;
    const fileMimeType = answer.file_mime_type || inferMimeType(answer.file_name);
    if (filePath) {
      const { data, error } = await admin.storage
        .from("exam-answers")
        .download(filePath);
      if (error) throw new Error(`Could not download answer file: ${error.message}`);
      fileBytes = new Uint8Array(await data.arrayBuffer());
    }

    const question = answer.question;
    if (!question) throw new Error("Question context is unavailable for this answer.");
    if (!answer.text_answer?.trim() && !fileBytes) {
      throw new Error("The answer contains neither text nor a readable file.");
    }

    const review = await processAnswerWithHuggingFace({
      questionPrompt: question.prompt,
      answerGuide: question.answer_guide,
      marks: question.marks,
      textAnswer: answer.text_answer,
      fileBytes,
      fileMimeType,
      fileName: answer.file_name,
    });

    const status = review.confidence < 0.55 ? "needs_review" : "ready_for_review";
    await admin
      .from("exam_answer_reviews")
      .update({
        processing_status: status,
        extracted_text: review.extracted_text || null,
        suggested_marks: review.suggested_marks,
        suggested_feedback: review.suggested_feedback || null,
        model_confidence: review.confidence,
        model_name: answerProcessorModelName(),
        processing_error: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Answer processing failed.";
    console.error("[answer-processing]", message);
    await admin
      .from("exam_answer_reviews")
      .update({
        processing_status: "failed",
        processing_error: message.slice(0, 1000),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      answerId?: number;
      force?: boolean;
    };
    const answerId = Number(body.answerId);
    if (!Number.isInteger(answerId) || answerId <= 0) {
      return NextResponse.json({ error: "A valid answerId is required." }, { status: 400 });
    }

    const client = await createServerSupabase();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const { data, error } = await client
      .from("exam_answers")
      .select(
        "id, submission_id, question_id, text_answer, image_path, image_url, file_path, file_url, file_name, file_mime_type, file_size, exam_submissions!inner(id, user_id), exam_questions!inner(id, prompt, answer_guide, marks)",
      )
      .eq("id", answerId)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Answer not found." }, { status: 404 });
    }

    const raw = data as unknown as AnswerContext & {
      exam_submissions: AnswerContext["submission"] | AnswerContext["submission"][];
      exam_questions: AnswerContext["question"] | AnswerContext["question"][];
    };
    const answer: AnswerContext = {
      ...raw,
      submission: Array.isArray(raw.exam_submissions)
        ? raw.exam_submissions[0] || null
        : raw.exam_submissions,
      question: Array.isArray(raw.exam_questions)
        ? raw.exam_questions[0] || null
        : raw.exam_questions,
    };

    const admin = createAdminSupabase();
    const { data: existing } = await admin
      .from("exam_answer_reviews")
      .select("id, processing_status, attempt_count")
      .eq("answer_id", answerId)
      .maybeSingle();
    if (
      existing &&
      !body.force &&
      ["processing", "ready_for_review", "needs_review", "reviewed"].includes(
        existing.processing_status,
      )
    ) {
      return NextResponse.json({ accepted: true, status: existing.processing_status });
    }

    const nextAttempt = (existing?.attempt_count || 0) + 1;
    const { data: review, error: reviewError } = await admin
      .from("exam_answer_reviews")
      .upsert(
        {
          answer_id: answerId,
          processing_status: "processing",
          attempt_count: nextAttempt,
          started_at: new Date().toISOString(),
          completed_at: null,
          processing_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "answer_id" },
      )
      .select("id")
      .single();
    if (reviewError || !review) {
      return NextResponse.json(
        { error: reviewError?.message || "Could not queue answer processing." },
        { status: 500 },
      );
    }

    await admin
      .from("exam_submissions")
      .update({ status: "processing" })
      .eq("id", answer.submission_id);

    after(async () => processAnswer(answer, review.id));
    return NextResponse.json(
      { accepted: true, status: "processing", answerId },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not queue answer processing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
