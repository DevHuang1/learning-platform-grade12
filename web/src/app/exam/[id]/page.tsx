"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { QUESTION_TYPE_LABELS } from "@/lib/constants";
import { fetchExamSheet, insertAnswer, insertSubmission } from "@/lib/db";
import {
  ensureBuckets,
  EXAM_ANSWERS_BUCKET,
  getPublicUrl,
  QUESTION_IMAGES_BUCKET,
  uploadAnswerFile,
} from "@/lib/storage";
import { hasSupabase } from "@/lib/supabase";
import type {
  ExamQuestionRow,
  ExamSectionRow,
  ExamSubmissionRow,
  ExamWithSections,
} from "@/lib/types";

type FlatQuestion = {
  question: ExamQuestionRow;
  section: ExamSectionRow;
};

const NAME_KEY = "g12_student_name";

function isAnswerImage(file: File | null) {
  return Boolean(
    file &&
      (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name)),
  );
}

function isAnswerPdf(file: File | null) {
  return Boolean(file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name)));
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default function TakeExamPage() {
  const params = useParams<{ id: string }>();
  const sheetId = Number(params?.id);

  const { user, profile, configured } = useAuth();
  const toast = useToast();

  const [sheet, setSheet] = useState<ExamWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [currentChoice, setCurrentChoice] = useState("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [answersSaved, setAnswersSaved] = useState(0);
  const bucketsChecked = useRef(false);

  useEffect(() => {
    if (hasSupabase()) {
      ensureBuckets();
    }
  }, []);

  const signedInName = profile?.full_name || user?.email || "Student";
  const effectiveName = user ? signedInName : studentName;

  const flatQuestions = useMemo<FlatQuestion[]>(() => {
    if (!sheet) return [];
    const out: FlatQuestion[] = [];
    for (const s of sheet.sections) {
      for (const q of s.questions) {
        out.push({ question: q, section: s });
      }
    }
    return out;
  }, [sheet]);

  useEffect(() => {
    if (!sheetId || Number.isNaN(sheetId)) {
      setLoadError("Invalid exam id");
      setLoading(false);
      return;
    }
    fetchExamSheet(sheetId)
      .then((s) => {
        if (s) setSheet(s);
        else setLoadError("Exam sheet not found");
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Failed to load exam"),
      )
      .finally(() => setLoading(false));
  }, [sheetId]);

  useEffect(() => {
    setStudentName(localStorage.getItem(NAME_KEY) || "");
  }, []);

  useEffect(() => {
    setCurrentChoice("");
  }, [currentIndex]);

  const current = flatQuestions[currentIndex];

  const questionImageUrl = useMemo(() => {
    if (!current) return null;
    return (
      current.question.image_url ||
      getPublicUrl(QUESTION_IMAGES_BUCKET, current.question.image_path || "")
    );
  }, [current]);

  const sectionImageUrl = useMemo(() => {
    if (!current) return null;
    return (
      current.section.image_url ||
      getPublicUrl(QUESTION_IMAGES_BUCKET, current.section.image_path || "")
    );
  }, [current]);

  const isChoiceType =
    current?.question.question_type === "multiple_choice" ||
    current?.question.question_type === "true_false";

  const questionOptions = current
    ? current.question.question_type === "true_false" &&
      current.question.options.length === 0
      ? ["True", "False"]
      : current.question.options
    : [];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAnswerPdf(file) && !isAnswerImage(file)) {
      setSubmitError("Only PDF and image files are accepted.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setSubmitError("Files must be 12 MB or smaller.");
      return;
    }
    if (currentPreview) URL.revokeObjectURL(currentPreview);
    setSubmitError(null);
    setCurrentFile(file);
    setCurrentPreview(isAnswerImage(file) ? URL.createObjectURL(file) : null);
  }

  function handleRemoveFile() {
    if (currentPreview) URL.revokeObjectURL(currentPreview);
    setCurrentFile(null);
    setCurrentPreview(null);
  }

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    const name = studentName.trim();
    if (!name) return;
    localStorage.setItem(NAME_KEY, name);
    setStudentName(name);
  }

  async function submitAnswer() {
    const q = current;
    if (!q) return;
    if (isChoiceType) {
      if (!currentChoice) {
        setSubmitError("Select an option to continue.");
        return;
      }
    } else if (!currentFile && !currentText.trim()) {
      setSubmitError(
        "Attach an image of your written answer (or type something).",
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (hasSupabase()) {
        if (!bucketsChecked.current) {
          await ensureBuckets();
          bucketsChecked.current = true;
        }
        let sub: ExamSubmissionRow | null = null;
        if (submissionId !== null) {
          sub = { id: submissionId } as ExamSubmissionRow;
        }
        if (!sub) {
          sub = await insertSubmission({
            sheet_id: sheet!.id,
            student_name: effectiveName,
            user_id: user?.id ?? null,
          });
          if (sub) setSubmissionId(sub.id);
        }
        if (!sub) throw new Error("Could not create submission");
        let filePath: string | null = null;
        let fileUrl: string | null = null;
        let fileName: string | null = null;
        let fileMimeType: string | null = null;
        let fileSize: number | null = null;
        if (currentFile) {
          const res = await uploadAnswerFile(
            EXAM_ANSWERS_BUCKET,
            `submission-${sub.id}`,
            currentFile,
          );
          if (!("path" in res)) throw new Error(res.error);
          filePath = res.path;
          fileUrl = res.publicUrl;
          fileName = res.fileName;
          fileMimeType = res.mimeType;
          fileSize = res.fileSize;
        }
        const answer = await insertAnswer({
          submission_id: sub.id,
          question_id: q.question.id,
          text_answer: isChoiceType
            ? currentChoice || null
            : currentText.trim() || null,
          image_path: isAnswerImage(currentFile) ? filePath : null,
          image_url: isAnswerImage(currentFile) ? fileUrl : null,
          file_path: filePath,
          file_url: fileUrl,
          file_name: fileName,
          file_mime_type: fileMimeType,
          file_size: fileSize,
          marks_awarded: null,
        });
        let processingQueued = false;
        if (answer) {
          try {
            const response = await fetch("/api/exam/process-answer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ answerId: answer.id }),
            });
            processingQueued = response.ok;
          } catch {
            processingQueued = false;
          }
        }
        if (processingQueued) {
          toast.success(
            "Answer saved for teacher review.",
            currentFile
              ? "The uploaded file is processing in the background."
              : "A review suggestion will appear in the teacher dashboard.",
          );
        } else {
          toast.error(
            "Answer saved, but processing is pending.",
            "A teacher can retry processing from the Results screen.",
          );
        }
      }
      if (currentIndex + 1 >= flatQuestions.length) {
        setFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setCurrentText("");
        if (currentPreview) URL.revokeObjectURL(currentPreview);
        setCurrentFile(null);
        setCurrentPreview(null);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to submit answer";
      toast.error(
        currentFile ? "Upload failed" : "Submit failed",
        currentFile ? message : undefined,
      );
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm text-gray-500">Loading exam…</p>
      </Shell>
    );
  }

  if (loadError || !sheet) {
    return (
      <Shell>
        <Card className="border-red-200 bg-red-50 text-center">
          <p className="text-lg font-bold text-red-700">
            {loadError || "Exam sheet not found"}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/exam">
              <Button variant="secondary">Back to Exams</Button>
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      {!configured && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-700">
            Supabase is not configured — running in dry-run mode
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Your answers won&apos;t be saved. Setup Supabase to submit for real.
          </p>
        </Card>
      )}

      {!user && !studentName ? (
        <Card className="mx-auto max-w-md">
          <h2 className="font-serif text-lg font-bold text-gray-900">
            Enter your name
          </h2>
          <p className="mt-1 text-sm text-gray-500">{sheet.title}</p>
          <form onSubmit={saveName} className="mt-4 flex flex-col gap-3">
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Your full name"
              className="border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <Button
              type="submit"
              className="w-full"
              disabled={!studentName.trim()}
            >
              Start Exam
            </Button>
          </form>
        </Card>
      ) : finished ? (
        <Card className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center bg-emerald-100 text-emerald-600">
            <CheckIcon />
          </div>
          <h2 className="mt-4 font-serif text-lg font-bold text-gray-900">
            Submitted
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            You answered {answersSaved} of {flatQuestions.length} questions.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/result">
              <Button size="lg">View your results</Button>
            </Link>
            <Link href="/exam">
              <Button variant="ghost" size="lg">
                Back to exams
              </Button>
            </Link>
          </div>
        </Card>
      ) : current ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-bold text-gray-900">
              {sheet.title}
            </h2>
            <Badge tone="gray">{current.question.marks} marks</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-indigo-100 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-indigo-700">
              Question {currentIndex + 1} of {flatQuestions.length}
            </span>
            <Badge tone="amber">{current.section.title}</Badge>
          </div>

          <div className="h-2 w-full overflow-hidden bg-gray-200">
            <div
              className="h-full bg-ink transition-all"
              style={{
                width: `${((currentIndex + 1) / flatQuestions.length) * 100}%`,
              }}
            />
          </div>

          <Card>
            {sectionImageUrl ? (
              <div className="mb-3 overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sectionImageUrl}
                  alt="Section image"
                  className="max-h-72 w-full object-contain bg-gray-50"
                />
              </div>
            ) : null}
            {questionImageUrl ? (
              <div className="mb-3 overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={questionImageUrl}
                  alt="Question image"
                  className="max-h-72 w-full object-contain bg-gray-50"
                />
              </div>
            ) : null}
            <div className="mb-2">
              <Badge tone="indigo">
                {QUESTION_TYPE_LABELS[current.question.question_type]}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {current.question.prompt}
            </p>
          </Card>

          <Card>
            {current.question.question_type === "multiple_choice" ? (
              <div>
                <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-gray-700">
                  Choose one option
                </label>
                <div className="flex flex-col gap-2">
                  {questionOptions.map((opt) => {
                    const selected = currentChoice === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCurrentChoice(opt)}
                        className={cn(
                          "border px-4 py-3 text-left text-sm transition-colors",
                          selected
                            ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                            : "border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50",
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {current.question.question_type === "true_false" ? (
              <div>
                <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-gray-700">
                  True or false?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {questionOptions.map((opt) => {
                    const selected = currentChoice === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCurrentChoice(opt)}
                        className={cn(
                          "border px-4 py-4 text-sm font-semibold transition-colors",
                          selected
                            ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                            : "border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50",
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {current.question.question_type === "fill_blank" ? (
              <div>
                <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-gray-700">
                  Your answer
                </label>
                <input
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  placeholder="Type the missing word…"
                  className="w-full border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            ) : null}

            {current.question.question_type === "short_answer" ? (
              <div>
                <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-gray-700">
                  Text answer (optional)
                </label>
                <textarea
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  rows={3}
                  placeholder="Type a short answer if you like…"
                  className="w-full border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />

                <div className="mt-4">
                  <label className="mb-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-gray-700">
                    Upload a PDF or image answer (optional)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFile}
                    className="block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:border-0 file:bg-indigo-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200"
                  />
                  {currentPreview ? (
                    <div className="mt-3">
                      <div className="relative overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentPreview}
                          alt="Answer preview"
                          className="max-h-72 w-full object-contain bg-gray-50"
                        />
                        <button
                          onClick={handleRemoveFile}
                          aria-label="Remove uploaded file"
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center bg-gray-900/70 text-white transition-colors hover:bg-red-600"
                        >
                          <XIcon />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        Attached image — remove it if you picked the wrong file.
                      </p>
                    </div>
                  ) : currentFile ? (
                    <div className="mt-3 flex items-center justify-between gap-3 border border-indigo-100 bg-indigo-50 px-3 py-3 text-sm text-indigo-900">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{currentFile.name}</p>
                        <p className="text-xs text-indigo-700">
                          PDF · {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="shrink-0 text-xs font-bold uppercase tracking-[0.08em] text-indigo-700 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400">
                      PDF, JPG, PNG, or WEBP up to 12 MB. A teacher will review
                      the transformer suggestion before grades are saved.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {submitError && (
              <p className="mt-3 text-sm font-semibold text-red-600">
                {submitError}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <Button
                onClick={submitAnswer}
                disabled={submitting}
                size="lg"
                className={cn(currentIndex > 0 && "flex-1", "sm:flex-1")}
              >
                {submitting ? (
                  <>
                    <Spinner />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadIcon />
                    Submit answer
                  </>
                )}
              </Button>
              {currentIndex > 0 && (
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={submitting}
                  onClick={() => setCurrentIndex((i) => i - 1)}
                >
                  Back
                </Button>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="text-center">
          <p className="text-sm text-gray-500">
            No questions in this exam yet.
          </p>
        </Card>
      )}
    </Shell>
  );
}
