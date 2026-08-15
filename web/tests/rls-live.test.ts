import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_RLS_TEST_URL;
const anonKey = process.env.SUPABASE_RLS_TEST_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_RLS_TEST_SERVICE_ROLE_KEY;
const live = Boolean(url && anonKey && serviceRoleKey);

type TestUser = { id: string; email: string; password: string };

const describeLive = describe.skipIf(!live);

describeLive("live Supabase answer RLS", () => {
  let admin: SupabaseClient;
  let owner: SupabaseClient;
  let otherStudent: SupabaseClient;
  let teacher: SupabaseClient;
  let ownerUser: TestUser;
  let otherUser: TestUser;
  let teacherUser: TestUser;
  let sheetId: number;
  let questionId: number;
  let ownerSubmissionId: number;
  let otherSubmissionId: number;
  let answerId: number;
  let reviewId: number;
  let answerPath: string;

  async function createTestUser(role: "student" | "teacher"): Promise<TestUser> {
    const email = `rls-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    const password = `RlsTest!${Math.random().toString(36).slice(2, 12)}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `RLS ${role}`, role },
    });
    if (error || !data.user) throw error || new Error("Test user was not created.");
    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: `RLS ${role}`,
      role,
    });
    if (profileError) throw profileError;
    return { id: data.user.id, email, password };
  }

  async function signIn(user: TestUser) {
    const client = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    if (error) throw error;
    return client;
  }

  beforeAll(async () => {
    admin = createClient(url!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    ownerUser = await createTestUser("student");
    otherUser = await createTestUser("student");
    teacherUser = await createTestUser("teacher");
    owner = await signIn(ownerUser);
    otherStudent = await signIn(otherUser);
    teacher = await signIn(teacherUser);

    const { data: sheet, error: sheetError } = await admin
      .from("exam_sheets")
      .insert({
        title: `RLS test sheet ${Date.now()}`,
        subject: "English",
        description: "Temporary RLS test fixture",
        duration_minutes: 10,
        status: "published",
      })
      .select("id")
      .single();
    if (sheetError || !sheet) throw sheetError || new Error("Test sheet was not created.");
    sheetId = sheet.id;

    const { data: section, error: sectionError } = await admin
      .from("exam_sheet_sections")
      .insert({ sheet_id: sheetId, position: 1, title: "RLS section", instructions: "" })
      .select("id")
      .single();
    if (sectionError || !section) throw sectionError || new Error("Test section was not created.");

    const { data: question, error: questionError } = await admin
      .from("exam_questions")
      .insert({
        section_id: section.id,
        position: 1,
        prompt: "Explain the central idea.",
        answer_guide: "Use evidence.",
        marks: 5,
        question_type: "short_answer",
        options: [],
        correct_option: 0,
      })
      .select("id")
      .single();
    if (questionError || !question) throw questionError || new Error("Test question was not created.");
    questionId = question.id;

    const { data: ownerSubmission, error: ownerSubmissionError } = await admin
      .from("exam_submissions")
      .insert({
        sheet_id: sheetId,
        user_id: ownerUser.id,
        student_name: "RLS student owner",
        status: "submitted",
        obtained_marks: 0,
      })
      .select("id")
      .single();
    if (ownerSubmissionError || !ownerSubmission) throw ownerSubmissionError || new Error("Owner submission was not created.");
    ownerSubmissionId = ownerSubmission.id;

    const { data: otherSubmission, error: otherSubmissionError } = await admin
      .from("exam_submissions")
      .insert({
        sheet_id: sheetId,
        user_id: otherUser.id,
        student_name: "RLS student other",
        status: "submitted",
        obtained_marks: 0,
      })
      .select("id")
      .single();
    if (otherSubmissionError || !otherSubmission) throw otherSubmissionError || new Error("Other submission was not created.");
    otherSubmissionId = otherSubmission.id;

    answerPath = `submission-${ownerSubmissionId}/rls-answer.txt`;
    const { error: uploadError } = await admin.storage
      .from("exam-answers")
      .upload(answerPath, new Blob(["private answer fixture"], { type: "text/plain" }), {
        contentType: "text/plain",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: answer, error: answerError } = await admin
      .from("exam_answers")
      .insert({
        submission_id: ownerSubmissionId,
        question_id: questionId,
        text_answer: "private answer fixture",
        file_path: answerPath,
        file_name: "rls-answer.txt",
        file_mime_type: "text/plain",
        file_size: 22,
        marks_awarded: null,
      })
      .select("id")
      .single();
    if (answerError || !answer) throw answerError || new Error("Test answer was not created.");
    answerId = answer.id;

    const { data: review, error: reviewError } = await admin
      .from("exam_answer_reviews")
      .insert({ answer_id: answerId, processing_status: "queued", attempt_count: 0 })
      .select("id")
      .single();
    if (reviewError || !review) throw reviewError || new Error("Test review was not created.");
    reviewId = review.id;
  });

  afterAll(async () => {
    if (!admin) return;
    if (answerPath) await admin.storage.from("exam-answers").remove([answerPath]);
    if (sheetId) await admin.from("exam_sheets").delete().eq("id", sheetId);
    for (const user of [ownerUser, otherUser, teacherUser]) {
      if (user?.id) await admin.auth.admin.deleteUser(user.id);
    }
  });

  it("lets the owner read only their own submission and answer", async () => {
    const { data: submissions, error: submissionError } = await owner
      .from("exam_submissions")
      .select("id")
      .in("id", [ownerSubmissionId, otherSubmissionId]);
    const { data: answers, error: answerError } = await owner
      .from("exam_answers")
      .select("id")
      .in("id", [answerId]);

    expect(submissionError).toBeNull();
    expect(answerError).toBeNull();
    expect(submissions?.map((row) => row.id)).toEqual([ownerSubmissionId]);
    expect(answers?.map((row) => row.id)).toEqual([answerId]);
  });

  it("prevents another student from reading the owner submission, answer, file, or review", async () => {
    const { data: submissions, error: submissionError } = await otherStudent
      .from("exam_submissions")
      .select("id")
      .eq("id", ownerSubmissionId);
    const { data: answers, error: answerError } = await otherStudent
      .from("exam_answers")
      .select("id")
      .eq("id", answerId);
    const { data: reviews, error: reviewError } = await otherStudent
      .from("exam_answer_reviews")
      .select("id")
      .eq("id", reviewId);
    const { data: file, error: fileError } = await otherStudent.storage
      .from("exam-answers")
      .download(answerPath);

    expect(submissionError).toBeNull();
    expect(answerError).toBeNull();
    expect(reviewError).toBeNull();
    expect(fileError).not.toBeNull();
    expect(submissions).toEqual([]);
    expect(answers).toEqual([]);
    expect(reviews).toEqual([]);
    expect(file).toBeNull();
  });

  it("allows a teacher to read the submission, review, and private file", async () => {
    const { data: submissions, error: submissionError } = await teacher
      .from("exam_submissions")
      .select("id")
      .eq("id", ownerSubmissionId);
    const { data: reviews, error: reviewError } = await teacher
      .from("exam_answer_reviews")
      .select("id, processing_status")
      .eq("id", reviewId);
    const { data: file, error: fileError } = await teacher.storage
      .from("exam-answers")
      .download(answerPath);

    expect(submissionError).toBeNull();
    expect(reviewError).toBeNull();
    expect(fileError).toBeNull();
    expect(submissions).toHaveLength(1);
    expect(reviews?.[0]?.processing_status).toBe("queued");
    expect(file).not.toBeNull();
  });

  it("rejects forged student marks, public URLs, and graded submissions", async () => {
    const { error: forgedSubmissionError } = await owner.from("exam_submissions").insert({
      sheet_id: sheetId,
      user_id: ownerUser.id,
      student_name: "RLS forged",
      status: "graded",
      obtained_marks: 5,
      graded_by: "forged-client",
    });
    const { error: forgedAnswerError } = await owner.from("exam_answers").insert({
      submission_id: ownerSubmissionId,
      question_id: questionId,
      text_answer: "forged",
      marks_awarded: 5,
      feedback: "forged",
      file_url: "https://public.example/answer",
    });

    expect(forgedSubmissionError).not.toBeNull();
    expect(forgedAnswerError).not.toBeNull();
  });
});
