"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/toast";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  Spinner,
  StatBox,
} from "@/components/ui";
import {
  fetchAnswerReviews,
  fetchAnswersForSubmission,
  fetchExamSheet,
  fetchExamSheets,
  fetchMySubmissions,
  fetchSubmissions,
  gradeSubmission,
} from "@/lib/db";
import { QUESTION_TYPE_LABELS } from "@/lib/constants";
import { getPublicUrl, QUESTION_IMAGES_BUCKET } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { createClient, hasSupabase } from "@/lib/supabase";
import type {
  ExamAnswerReviewRow,
  ExamAnswerRow,
  ExamQuestionRow,
  ExamSectionRow,
  ExamSubmissionRow,
  ExamWithSections,
} from "@/lib/types";

type Detail = {
  submission: ExamSubmissionRow;
  answers: ExamAnswerRow[];
  reviews: ExamAnswerReviewRow[];
  sheet: ExamWithSections | null;
};

function buildQuestionMap(sheet: ExamWithSections) {
  const map = new Map<number, ExamQuestionRow>();
  for (const section of sheet.sections) {
    for (const q of section.questions) map.set(q.id, q);
  }
  return map;
}

function buildSectionMap(sheet: ExamWithSections) {
  const map = new Map<number, ExamSectionRow>();
  for (const section of sheet.sections) {
    for (const q of section.questions) map.set(q.id, section);
  }
  return map;
}

function isChoiceQuestion(q?: ExamQuestionRow) {
  return (
    !!q &&
    (q.question_type === "multiple_choice" || q.question_type === "true_false")
  );
}

function resolveSelectedOption(text: string | null, q?: ExamQuestionRow) {
  if (!text) return "";
  if (q && q.options.length > 0) {
    const idx = Number(text);
    if (Number.isInteger(idx) && idx >= 0 && idx < q.options.length) {
      return q.options[idx];
    }
    const match = q.options.find((o) => o === text);
    if (match) return match;
  }
  return text;
}

function correctOptionText(q?: ExamQuestionRow) {
  if (!q || q.options.length === 0) return null;
  if (q.correct_option < 0 || q.correct_option >= q.options.length) return null;
  return q.options[q.correct_option];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function AnswerMedia({ answer }: { answer: ExamAnswerRow }) {
  const hasFile = Boolean(answer.file_path || answer.image_path);
  const src = hasFile
    ? `/api/exam/answer-file?answerId=${encodeURIComponent(answer.id)}`
    : null;
  const isPdf =
    answer.file_mime_type === "application/pdf" ||
    answer.file_name?.toLowerCase().endsWith(".pdf");

  if (!src) {
    return (
      <div className="flex h-24 items-center justify-center border border-dashed border-gray-300 bg-gray-50 font-mono text-[11px] uppercase tracking-[0.08em] text-gray-400">
        No uploaded answer file
      </div>
    );
  }

  if (isPdf) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-100"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.08em]">PDF</span>
        <span className="max-w-[18rem] truncate">{answer.file_name || "Open answer PDF"}</span>
      </a>
    );
  }

  return (
    <div className="inline-block max-w-full overflow-hidden border border-gray-200 bg-gray-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Student answer"
        className="max-h-48 w-auto max-w-full object-contain transition duration-300 ease-out hover:scale-[1.03]"
      />
    </div>
  );
}

export default function ResultPage() {
  const { user, profile, loading: authLoading, configured } = useAuth();
  const { success, error } = useToast();
  const [sheets, setSheets] = useState<ExamWithSections[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmissionRow[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [marksInput, setMarksInput] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [retryingAnswerId, setRetryingAnswerId] = useState<number | null>(null);

  const isTeacher = profile?.role === "teacher";

  const reload = useCallback(async () => {
    if (!configured || !user) {
      setLoading(false);
      return;
    }
    const [rawSheets, subs] = await Promise.all([
      fetchExamSheets(),
      isTeacher ? fetchSubmissions() : fetchMySubmissions(user.id),
    ]);
    const detailed = await Promise.all(
      rawSheets.map((s) => fetchExamSheet(s.id)),
    );
    setSheets(
      detailed.filter((s): s is ExamWithSections => s !== null),
    );
    setSubmissions(subs);
    setLoading(false);
  }, [configured, user, isTeacher]);

  useEffect(() => {
    if (!configured || !user || authLoading) return;
    reload();
  }, [reload, configured, user, authLoading]);

  const sheetById = useMemo(() => {
    const map = new Map<number, ExamWithSections>();
    for (const s of sheets) map.set(s.id, s);
    return map;
  }, [sheets]);

  const filtered = useMemo(
    () =>
      selectedSheet === "all"
        ? submissions
        : submissions.filter((s) => s.sheet_id === Number(selectedSheet)),
    [submissions, selectedSheet],
  );

  const gradedSubs = useMemo(
    () => filtered.filter((s) => s.status === "graded"),
    [filtered],
  );

  const averagePct = useMemo(() => {
    const pcts = gradedSubs
      .map((s) => {
        const sheet = sheetById.get(s.sheet_id);
        if (!sheet || sheet.total_marks <= 0) return null;
        return (s.obtained_marks / sheet.total_marks) * 100;
      })
      .filter((p): p is number => p !== null);
    if (!pcts.length) return null;
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }, [gradedSubs, sheetById]);

  const questionMap = useMemo(
    () =>
      detail?.sheet
        ? buildQuestionMap(detail.sheet)
        : new Map<number, ExamQuestionRow>(),
    [detail],
  );

  const sectionMap = useMemo(
    () =>
      detail?.sheet
        ? buildSectionMap(detail.sheet)
        : new Map<number, ExamSectionRow>(),
    [detail],
  );

  const openDetail = async (sub: ExamSubmissionRow) => {
    if (detail?.submission.id === sub.id) {
      setDetail(null);
      return;
    }
    const answers = await fetchAnswersForSubmission(sub.id);
    const reviews = isTeacher
      ? await fetchAnswerReviews(answers.map((answer) => answer.id))
      : [];
    const sheet =
      sheetById.get(sub.sheet_id) ?? (await fetchExamSheet(sub.sheet_id));
    const reviewByAnswer = new Map(reviews.map((review) => [review.answer_id, review]));
    const defaults: Record<number, number> = {};
    for (const a of answers) {
      const q = sheet ? buildQuestionMap(sheet).get(a.question_id) : undefined;
      defaults[a.id] =
        a.marks_awarded ?? reviewByAnswer.get(a.id)?.suggested_marks ?? 0;
    }
    setMarksInput(defaults);
    setDetail({ submission: sub, answers, reviews, sheet: sheet ?? null });
  };

  const retryAnswer = async (answerId: number) => {
    if (retryingAnswerId !== null) return;
    setRetryingAnswerId(answerId);
    try {
      const response = await fetch("/api/exam/process-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId, force: true }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Could not retry processing.");
      }
      setDetail((current) => {
        if (!current) return current;
        return {
          ...current,
          reviews: current.reviews.map((review) =>
            review.answer_id === answerId
              ? { ...review, processing_status: "processing", processing_error: null }
              : review,
          ),
        };
      });
      success("Processing restarted", "The answer will be reviewed again in the background.");
    } catch (err) {
      error(
        "Retry failed",
        err instanceof Error ? err.message : "Could not retry processing.",
      );
    } finally {
      setRetryingAnswerId(null);
    }
  };

  const saveGrades = async () => {
    if (!detail || saving) return;
    setSaving(true);
    try {
      await gradeSubmission(
        detail.submission.id,
        detail.answers.map((a) => ({
          id: a.id,
          marks_awarded: Math.max(0, marksInput[a.id] ?? 0),
        })),
        "Teacher",
      );
      const subs = await fetchSubmissions();
      setSubmissions(subs);
      const updated = subs.find((s) => s.id === detail.submission.id);
      const answers = await fetchAnswersForSubmission(detail.submission.id);
      const reviews = await fetchAnswerReviews(answers.map((answer) => answer.id));
      setDetail({
        submission: updated ?? detail.submission,
        answers,
        reviews,
        sheet: detail.sheet,
      });
      success("Grades saved", `Graded ${detail.submission.student_name}'s submission.`);
    } catch (err) {
      error(
        "Failed to save grades",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isTeacher || !configured || !hasSupabase()) return;
    const client = createClient();
    const channel = client
      .channel("exam-answer-reviews-teacher-results")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_answer_reviews",
        },
        (payload) => {
          const review = payload.new as Partial<ExamAnswerReviewRow>;
          if (!review.answer_id) return;
          void reload();
          setDetail((current) => {
            if (!current || !current.answers.some((answer) => answer.id === review.answer_id)) {
              return current;
            }
            const nextReview = review as ExamAnswerReviewRow;
            const existing = current.reviews.some((item) => item.answer_id === review.answer_id);
            return {
              ...current,
              reviews: existing
                ? current.reviews.map((item) =>
                    item.answer_id === review.answer_id ? nextReview : item,
                  )
                : [...current.reviews, nextReview],
              submission: {
                ...current.submission,
                status:
                  review.processing_status === "processing"
                    ? "processing"
                    : current.submission.status,
              },
            };
          });
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [configured, isTeacher, reload]);

  if (!configured) {
    return (
      <Shell>
        <div className="border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] font-semibold text-gray-700">
            Results require Supabase
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Add your Supabase URL and anon key to .env.local to view exam
            results.
          </p>
        </div>
      </Shell>
    );
  }

  if (authLoading) {
    return (
      <Shell>
        <ResultSkeleton />
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] font-semibold text-gray-700">
            Sign in to view your results
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Your graded exam scores and feedback will appear here.
          </p>
          <Link href="/login" className="mt-4 inline-block">
            <Button>Go to login</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-gray-900">Results</h2>
            {isTeacher ? (
              <Badge tone="indigo">Teacher view — all students</Badge>
            ) : (
              <Badge tone="gray">Only your results</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Exam submissions and scores
          </p>
        </div>
        <label className="inline-flex max-w-full items-center gap-2 border border-gray-200 bg-white py-1.5 pl-3 pr-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-500">
            Exam sheet
          </span>
          <select
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.target.value)}
            className="border border-gray-300 bg-white px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] font-medium text-gray-700 focus:outline-2 focus:outline-indigo-600"
          >
            <option value="all">All sheets</option>
            {sheets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatBox
          label="Total submissions"
          value={filtered.length}
          icon={<ClipboardIcon className="h-4 w-4" />}
        />
        <StatBox
          label="Graded"
          value={gradedSubs.length}
          accent="text-emerald-600"
          icon={<CheckCircleIcon className="h-4 w-4" />}
        />
        <StatBox
          label="Average score"
          value={averagePct === null ? "—" : `${averagePct}%`}
          accent="text-indigo-600"
          icon={<TargetIcon className="h-4 w-4" />}
        />
      </div>

      {loading && <ResultSkeleton />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          title={isTeacher ? "No submissions to review" : "No results yet"}
          description={
            selectedSheet === "all"
              ? isTeacher
                ? "Exam submissions will appear here once students finish an exam."
                : "Your exam submissions will appear here once you finish an exam."
              : "No submissions found for this exam sheet."
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const sheet = sheetById.get(sub.sheet_id);
            const isOpen = detail?.submission.id === sub.id;
            return (
              <Card
                key={sub.id}
                className={cn(
                  "cursor-pointer p-0 transition-colors hover:border-indigo-300",
                  isOpen && "border-indigo-400",
                )}
              >
                <button
                  type="button"
                  onClick={() => openDetail(sub)}
                  className="flex w-full items-center gap-3 p-5 text-left"
                >
                  <Avatar name={sub.student_name} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900">
                      {sub.student_name}
                    </div>
                    <div className="truncate text-sm text-gray-500">
                      {sheet?.title ?? `Sheet #${sub.sheet_id}`}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {formatDate(sub.created_at)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge
                      tone={sub.status === "graded" ? "green" : "amber"}
                    >
                      {sub.status === "graded"
                        ? "Graded"
                        : sub.status === "processing"
                          ? "Processing"
                          : "Submitted"}
                    </Badge>
                    <div className="mt-1 text-sm font-semibold text-gray-900">
                      {sub.obtained_marks} / {sheet?.total_marks ?? "?"}
                    </div>
                  </div>
                  <ChevronIcon
                    className={cn(
                      "h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200",
                      isOpen && "rotate-180 text-indigo-600",
                    )}
                  />
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {detail && (
        <div className="mt-6">
          <Card className="border-indigo-200">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-bold text-gray-900">
                    {detail.submission.student_name}
                  </h3>
                  <Badge
                    tone={
                      detail.submission.status === "graded" ? "green" : "amber"
                    }
                  >
                      {detail.submission.status === "graded"
                        ? "Graded"
                        : detail.submission.status === "processing"
                          ? "Processing"
                          : "Submitted"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {detail.sheet?.title ?? `Sheet #${detail.submission.sheet_id}`}
                  {" · "}
                  {formatDate(detail.submission.created_at)}
                </p>
                {isTeacher ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">
                      Transformer progress: {detail.reviews.filter((review) =>
                        ["ready_for_review", "needs_review", "failed", "reviewed"].includes(
                          review.processing_status,
                        ),
                      ).length}/{detail.answers.length} answers processed
                    </span>
                    <span>
                      {detail.reviews.filter((review) => review.processing_status === "processing").length} processing
                    </span>
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
                      <span
                        className="block h-full rounded-full bg-indigo-500 transition-[width] duration-300"
                        style={{
                          width: `${detail.answers.length ? Math.round((detail.reviews.filter((review) => ["ready_for_review", "needs_review", "failed", "reviewed"].includes(review.processing_status)).length / detail.answers.length) * 100) : 0}%`,
                        }}
                      />
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="font-serif text-2xl font-bold text-indigo-600">
                  {detail.submission.obtained_marks}
                  <span className="font-serif text-base font-semibold text-gray-400">
                    {" / "}
                    {detail.sheet?.total_marks ?? "?"}
                  </span>
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-400">
                  Total score
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <EyeIcon className="h-4 w-4 text-indigo-600" />
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                View answers
              </h4>
            </div>

            <div className="space-y-4">
              {detail.answers.map((a, i) => {
                const q = questionMap.get(a.question_id);
                const section = sectionMap.get(a.question_id);
                const sectionImgSrc =
                  section &&
                  (section.image_path || section.image_url)
                    ? section.image_url ??
                      getPublicUrl(
                        QUESTION_IMAGES_BUCKET,
                        section.image_path || "",
                      )
                    : null;
                const graded = detail.submission.status === "graded";
                const review = detail.reviews.find((item) => item.answer_id === a.id);
                return (
                  <div
                    key={a.id}
                    className="border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-400">
                            Question {q ? q.position : i + 1} ·{" "}
                            {q ? q.marks : "?"} marks
                          </div>
                          {q?.question_type ? (
                            <Badge tone="gray">
                              {QUESTION_TYPE_LABELS[q.question_type] ??
                                q.question_type}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {q?.prompt ?? "No question prompt available"}
                        </p>
                        {sectionImgSrc ? (
                          <div className="mt-2 inline-block border border-gray-200 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sectionImgSrc}
                              alt="Section image"
                              className="max-h-40 w-auto border border-gray-200 bg-white object-contain"
                            />
                          </div>
                        ) : null}
                      </div>
                      {graded ? (
                        <Badge
                          tone={
                            a.marks_awarded === q?.marks && q
                              ? "green"
                              : a.marks_awarded && a.marks_awarded > 0
                                ? "indigo"
                                : "red"
                          }
                        >
                          {a.marks_awarded ?? 0} / {q?.marks ?? "?"}
                        </Badge>
                      ) : isTeacher ? (
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {review ? (
                            <Badge
                              tone={
                                review.processing_status === "failed"
                                  ? "red"
                                  : review.processing_status === "needs_review"
                                    ? "amber"
                                    : review.processing_status === "ready_for_review"
                                      ? "indigo"
                                      : "gray"
                              }
                            >
                              {review.processing_status === "ready_for_review"
                                ? "AI suggestion ready"
                                : review.processing_status === "needs_review"
                                  ? "Low confidence"
                                  : review.processing_status === "failed"
                                    ? "Processing failed"
                                    : review.processing_status === "processing"
                                      ? "Processing"
                                      : "Queued"}
                            </Badge>
                          ) : (
                            <Badge tone="gray">Not queued</Badge>
                          )}
                          {!review ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => retryAnswer(a.id)}
                              disabled={retryingAnswerId === a.id}
                            >
                              {retryingAnswerId === a.id ? <Spinner /> : null}
                              Process
                            </Button>
                          ) : null}
                          <label className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-500">
                            Final marks
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={q?.marks ?? 99}
                            value={marksInput[a.id] ?? ""}
                            onChange={(e) =>
                              setMarksInput((prev) => ({
                                ...prev,
                                [a.id]:
                                  e.target.value === ""
                                    ? 0
                                    : Number(e.target.value),
                              }))
                            }
                            className="w-20 border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:outline-2 focus:outline-indigo-600"
                          />
                          <span className="text-xs font-medium text-gray-400">
                            / {q?.marks ?? "?"}
                          </span>
                        </div>
                      ) : (
                        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-400">
                          Awaiting grading
                        </p>
                      )}
                    </div>

                    <div className="mt-3">
                      <AnswerMedia answer={a} />
                      {isChoiceQuestion(q) && a.text_answer ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-700">
                              Answer:{" "}
                            </span>
                            {resolveSelectedOption(a.text_answer, q)}
                          </p>
                          {isTeacher && correctOptionText(q) ? (
                            <p className="text-xs text-gray-500">
                              <span className="font-semibold text-gray-700">
                                Correct option:{" "}
                              </span>
                              {correctOptionText(q)}
                            </p>
                          ) : null}
                        </div>
                      ) : a.text_answer ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                          {a.text_answer}
                        </p>
                      ) : null}
                    </div>

                    {isTeacher &&
                    review &&
                    (review.extracted_text || review.suggested_feedback || review.processing_error) ? (
                      <div className="mt-3 border border-indigo-100 bg-indigo-50/60 px-3 py-3 text-sm text-indigo-950">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">Transformer suggestion</p>
                          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-indigo-700">
                            {review.model_confidence === null
                              ? "Confidence unavailable"
                              : `${Math.round(review.model_confidence * 100)}% confidence`}
                          </span>
                        </div>
                        {review.extracted_text ? (
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-indigo-900">
                            <span className="font-semibold">Transcription: </span>
                            {review.extracted_text}
                          </p>
                        ) : null}
                        {review.suggested_feedback ? (
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-indigo-900">
                            <span className="font-semibold">Suggested feedback: </span>
                            {review.suggested_feedback}
                          </p>
                        ) : null}
                        {review.processing_status === "failed" ? (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-red-700">
                            <span>{review.processing_error || "Processing failed."}</span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => retryAnswer(a.id)}
                              disabled={retryingAnswerId === a.id}
                            >
                              {retryingAnswerId === a.id ? <Spinner /> : null}
                              Retry
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {graded && a.feedback ? (
                      <p className="mt-2 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        <span className="font-semibold text-gray-700">
                          Feedback:{" "}
                        </span>
                        {a.feedback}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {isTeacher && detail.submission.status !== "graded" && (
              <div className="mt-5 flex items-center justify-end gap-3">
                <Button onClick={saveGrades} disabled={saving}>
                  {saving ? <Spinner /> : <CheckIcon className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save Grades"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </Shell>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-24" />
        </Card>
      ))}
    </div>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
