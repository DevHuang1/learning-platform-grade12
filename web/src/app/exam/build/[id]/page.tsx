"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge, Button, Card, ConfirmDialog, StatBox } from "@/components/ui";
import { useToast } from "@/components/toast";
import {
  deleteQuestion,
  deleteSection,
  fetchExamSheet,
  insertQuestion,
  insertSection,
  updateExamSheet,
} from "@/lib/db";
import { hasSupabase, supabase } from "@/lib/supabase";
import { getPublicUrl, QUESTION_IMAGES_BUCKET, removeImage, uploadImage } from "@/lib/storage";
import type { ExamWithSections } from "@/lib/types";

const STATUS_TONE: Record<string, "gray" | "green" | "amber"> = {
  draft: "gray",
  published: "green",
  closed: "amber",
};

function PlusIcon() {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  );
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

function QuestionIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  );
}

function MarksIcon() {
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
      <circle cx="12" cy="8" r="6" />
      <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
    </svg>
  );
}

function ClockIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function StatusIcon() {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  );
}

export default function ExamBuilderPage() {
  const params = useParams<{ id: string }>();
  const sheetId = Number(params?.id);

  const { profile, loading: authLoading } = useAuth();
  const toast = useToast();
  const isTeacher = profile?.role === "teacher";

  const [sheet, setSheet] = useState<ExamWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<"draft" | "published" | "closed">("draft");

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionInstructions, setNewSectionInstructions] = useState("");
  const [confirmRemoval, setConfirmRemoval] = useState<
    | { kind: "section"; id: number }
    | { kind: "question"; id: number }
    | null
  >(null);
  const [removalBusy, setRemovalBusy] = useState(false);
  const [addingSection, setAddingSection] = useState(false);

  const [questionDrafts, setQuestionDrafts] = useState<
    Record<number, { prompt: string; answer_guide: string; marks: string }>
  >({});
  const [newQuestions, setNewQuestions] = useState<
    Record<number, { prompt: string; answer_guide: string; marks: string }>
  >({});
  const [addingQuestionFor, setAddingQuestionFor] = useState<number | null>(null);

  useEffect(() => {
    if (!isTeacher) {
      setLoading(false);
      return;
    }
    if (!sheetId || Number.isNaN(sheetId)) {
      setError("Invalid sheet id");
      setLoading(false);
      return;
    }
    fetchExamSheet(sheetId)
      .then((s) => {
        if (!s) {
          setError("Sheet not found");
          return;
        }
        setSheet(s);
        setTitle(s.title);
        setSubject(s.subject);
        setDescription(s.description);
        setDuration(s.duration_minutes);
        setStatus(s.status);
        const drafts: Record<string, { prompt: string; answer_guide: string; marks: string }> = {};
        for (const sec of s.sections) {
          for (const q of sec.questions) {
            drafts[q.id] = {
              prompt: q.prompt,
              answer_guide: q.answer_guide,
              marks: String(q.marks),
            };
          }
        }
        setQuestionDrafts(drafts);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load sheet"))
      .finally(() => setLoading(false));
  }, [sheetId, isTeacher]);

  const totals = useMemo(() => {
    let qc = 0;
    let tm = 0;
    for (const sec of sheet?.sections || []) {
      for (const q of sec.questions) {
        qc += 1;
        tm += q.marks;
      }
    }
    return { question_count: qc, total_marks: tm };
  }, [sheet]);

  async function saveHeader() {
    if (!sheet) return;
    setError(null);
    try {
      await updateExamSheet(sheet.id, {
        title,
        subject,
        description,
        duration_minutes: Number(duration) || 60,
        status,
      });
      setSheet({ ...sheet, title, subject, description, duration_minutes: Number(duration) || 60, status });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      toast.success("Sheet updated");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save header";
      setError(message);
      toast.error("Failed to save", message);
    }
  }

  async function publishSheet() {
    if (!sheet) return;
    setError(null);
    try {
      await updateExamSheet(sheet.id, {
        title,
        subject,
        description,
        duration_minutes: Number(duration) || 60,
        status: "published",
      });
      setSheet({ ...sheet, title, subject, description, duration_minutes: Number(duration) || 60, status: "published" });
      setStatus("published");
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      toast.success("Sheet published", "Students can now take this exam.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to publish sheet";
      setError(message);
      toast.error("Failed to publish", message);
    }
  }

  async function handleAddSection() {
    if (!sheet) return;
    const t = newSectionTitle.trim();
    if (!t) return;
    setError(null);
    try {
      await insertSection(sheet.id, t, sheet.sections.length, newSectionInstructions.trim());
      const updated = await fetchExamSheet(sheet.id);
      if (updated) {
        setSheet(updated);
        const drafts: Record<string, { prompt: string; answer_guide: string; marks: string }> = {};
        for (const sec of updated.sections) {
          for (const q of sec.questions) {
            drafts[q.id] = { prompt: q.prompt, answer_guide: q.answer_guide, marks: String(q.marks) };
          }
        }
        setQuestionDrafts(drafts);
      }
      setNewSectionTitle("");
      setNewSectionInstructions("");
      setAddingSection(false);
      toast.success("Section added");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add section";
      setError(message);
      toast.error("Failed to add section", message);
    }
  }

  async function handleRemoveSection(id: number) {
    setError(null);
    setRemovalBusy(true);
    try {
      await deleteSection(id);
      const updated = await fetchExamSheet(sheet!.id);
      if (updated) setSheet(updated);
      toast.success("Section deleted");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete section";
      setError(message);
      toast.error("Failed to delete section", message);
    } finally {
      setRemovalBusy(false);
      setConfirmRemoval(null);
    }
  }

  async function handleAddQuestion(sectionId: number) {
    if (!sheet) return;
    const d = newQuestions[sectionId] || { prompt: "", answer_guide: "", marks: "1" };
    if (!d.prompt.trim()) return;
    setError(null);
    const section = sheet.sections.find((s) => s.id === sectionId);
    try {
      await insertQuestion(sectionId, {
        position: section ? section.questions.length : 0,
        prompt: d.prompt.trim(),
        answer_guide: d.answer_guide.trim(),
        marks: Math.max(1, Number(d.marks) || 1),
      });
      const updated = await fetchExamSheet(sheet.id);
      if (updated) {
        setSheet(updated);
        const drafts: Record<string, { prompt: string; answer_guide: string; marks: string }> = {};
        for (const sec of updated.sections) {
          for (const q of sec.questions) {
            drafts[q.id] = { prompt: q.prompt, answer_guide: q.answer_guide, marks: String(q.marks) };
          }
        }
        setQuestionDrafts(drafts);
      }
      setNewQuestions((m) => ({ ...m, [sectionId]: { prompt: "", answer_guide: "", marks: "1" } }));
      setAddingQuestionFor(null);
      toast.success("Question added");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add question";
      setError(message);
      toast.error("Failed to add question", message);
    }
  }

  async function handleRemoveQuestion(id: number) {
    setError(null);
    setRemovalBusy(true);
    try {
      await deleteQuestion(id);
      const updated = await fetchExamSheet(sheet!.id);
      if (updated) setSheet(updated);
      toast.success("Question deleted");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete question";
      setError(message);
      toast.error("Failed to delete question", message);
    } finally {
      setRemovalBusy(false);
      setConfirmRemoval(null);
    }
  }

  function patchQuestion(id: number, patch: Partial<{ prompt: string; answer_guide: string; marks: string }>) {
    setQuestionDrafts((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
  }

  async function persistQuestion(id: number, patch: Partial<{ prompt: string; answer_guide: string; marks: string }>) {
    if (!hasSupabase()) return;
    try {
      await supabase
        .from("exam_questions")
        .update({
          ...(patch.prompt !== undefined ? { prompt: patch.prompt } : {}),
          ...(patch.answer_guide !== undefined ? { answer_guide: patch.answer_guide } : {}),
          ...(patch.marks !== undefined ? { marks: Math.max(1, Number(patch.marks) || 1) } : {}),
        })
        .eq("id", id);
      setSheet((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections.map((s) => ({
                ...s,
                questions: s.questions.map((q) =>
                  q.id === id
                    ? {
                        ...q,
                        prompt: patch.prompt !== undefined ? patch.prompt : q.prompt,
                        answer_guide: patch.answer_guide !== undefined ? patch.answer_guide : q.answer_guide,
                        marks: patch.marks !== undefined ? Math.max(1, Number(patch.marks) || 1) : q.marks,
                      }
                    : q,
                ),
              })),
            }
          : prev,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save question";
      setError(message);
      toast.error("Failed to save question", message);
    }
  }

  async function handleUploadImage(q: ExamWithSections["sections"][number]["questions"][number], file: File) {
    try {
      const res = await uploadImage(QUESTION_IMAGES_BUCKET, `sheet-${sheet?.id}`, file);
      if (!("path" in res)) throw new Error(res.error);
      const image_path = res.path;
      const image_url = res.publicUrl;
      await supabase
        .from("exam_questions")
        .update({ image_path, image_url })
        .eq("id", q.id);
      setSheet((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections.map((s) => ({
                ...s,
                questions: s.questions.map((x) =>
                  x.id === q.id ? { ...x, image_path, image_url } : x,
                ),
              })),
            }
          : prev,
      );
      toast.success("Image uploaded");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to upload image";
      setError(message);
      toast.error("Failed to upload image", message);
    }
  }

  async function handleRemoveImage(q: ExamWithSections["sections"][number]["questions"][number]) {
    try {
      await removeImage(QUESTION_IMAGES_BUCKET, q.image_path);
      await supabase
        .from("exam_questions")
        .update({ image_path: null, image_url: null })
        .eq("id", q.id);
      setSheet((prev) =>
        prev
          ? {
              ...prev,
              sections: prev.sections.map((s) => ({
                ...s,
                questions: s.questions.map((x) =>
                  x.id === q.id ? { ...x, image_path: null, image_url: null } : x,
                ),
              })),
            }
          : prev,
      );
      toast.success("Image removed");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to remove image";
      setError(message);
      toast.error("Failed to remove image", message);
    }
  }

  if (authLoading) {
    return (
      <Shell>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <Card className="mb-4">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        </Card>
        <div className="h-48 animate-pulse rounded-2xl bg-gray-200" />
      </Shell>
    );
  }

  if (!isTeacher) {
    return (
      <Shell>
        {!hasSupabase() && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <p className="text-sm font-semibold text-amber-700">
              Supabase is not configured
            </p>
            <p className="mt-1 text-sm text-amber-700">
              You can&apos;t build or edit exam sheets without a Supabase backend.
            </p>
          </Card>
        )}
        <Card className="mx-auto max-w-md text-center">
          <h2 className="text-lg font-bold text-gray-900">Teachers only</h2>
          <p className="mt-1 text-sm text-gray-500">
            This is the exam builder. You need a teacher account to edit exam
            sheets. Sign in with a teacher account or ask your teacher for help.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/exam">
              <Button>Take Exams</Button>
            </Link>
            <Link href="/exam/build">
              <Button variant="secondary">Back to Builder</Button>
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <Card className="mb-4">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        </Card>
        <div className="h-48 animate-pulse rounded-2xl bg-gray-200" />
      </Shell>
    );
  }

  if (error && !sheet) {
    return (
      <Shell>
        <Card className="border-red-200 bg-red-50 text-center">
          <p className="text-lg font-bold text-red-700">{error}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/exam/build">
              <Button variant="secondary">Back to Builder</Button>
            </Link>
            <Link href="/exam">
              <Button>Take Exams</Button>
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  if (!sheet) return null;

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Exam Builder</h2>
          <p className="text-sm text-gray-500">Design your custom exam sheet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/exam/build">
            <Button variant="secondary">All Sheets</Button>
          </Link>
          <Link href="/exam">
            <Button variant="ghost">Take Exams</Button>
          </Link>
        </div>
      </div>

      {!hasSupabase() && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-700">
            Supabase is not configured
          </p>
          <p className="mt-1 text-sm text-amber-700">
            You can&apos;t build or edit exam sheets without a Supabase backend.
          </p>
        </Card>
      )}
      {error && sheet && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Questions" value={totals.question_count} icon={<QuestionIcon />} />
        <StatBox label="Total Marks" value={totals.total_marks} accent="text-indigo-600" icon={<MarksIcon />} />
        <StatBox label="Duration" value={`${sheet.duration_minutes}m`} icon={<ClockIcon />} />
        <StatBox label="Status" value={<Badge tone={STATUS_TONE[sheet.status] || "gray"}>{status}</Badge>} icon={<StatusIcon />} />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-gray-900">Sheet details</h3>
          <div className="flex items-center gap-2">
            <Badge tone={savedFlash ? "green" : "gray"}>
              {savedFlash ? "Saved" : status}
            </Badge>
            <Button onClick={saveHeader} disabled={!hasSupabase()}>
              Save
            </Button>
            {hasSupabase() && status !== "published" && (
              <Button variant="success" onClick={publishSheet}>
                Publish
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Duration (minutes)</label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </Card>

      {sheet.sections.length === 0 && (
        <Card className="mb-4 py-8 text-center">
          <p className="text-sm font-semibold text-gray-600">No sections yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Add a section to start building your exam.
          </p>
        </Card>
      )}

      {sheet.sections.map((section, si) => (
        <Card key={section.id} className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge tone="indigo">Section {si + 1}</Badge>
              <h3 className="font-bold text-gray-900">{section.title}</h3>
            </div>
            {hasSupabase() && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmRemoval({ kind: "section", id: section.id })}
              >
                <TrashIcon />
                Delete
              </Button>
            )}
          </div>
          {section.instructions && (
            <p className="mt-1 text-sm text-gray-500">{section.instructions}</p>
          )}

          {section.questions.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {section.questions.map((q, qi) => {
                const d = questionDrafts[q.id] || { prompt: "", answer_guide: "", marks: String(q.marks) };
                return (
                  <div key={q.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-400">Q{qi + 1}</span>
                      {hasSupabase() && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="px-2 py-1 text-xs"
                          onClick={() => setConfirmRemoval({ kind: "question", id: q.id })}
                        >
                          <TrashIcon />
                          Remove
                        </Button>
                      )}
                    </div>
                    {q.image_url || q.image_path ? (
                      <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={q.image_url || (q.image_path ? getPublicUrl(QUESTION_IMAGES_BUCKET, q.image_path) : undefined)}
                          alt="Question image"
                          className="max-h-40 w-full object-contain"
                        />
                        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-1.5">
                          <span className="text-xs font-semibold text-gray-400">Question image</span>
                          {hasSupabase() && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="px-2 py-1 text-xs"
                              onClick={() => handleRemoveImage(q)}
                            >
                              Remove image
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      hasSupabase() && (
                        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-indigo-400 hover:text-indigo-600">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) handleUploadImage(q, file);
                            }}
                          />
                          <UploadIcon />
                          Add image
                        </label>
                      )
                    )}
                    <textarea
                      value={d.prompt}
                      onChange={(e) => patchQuestion(q.id, { prompt: e.target.value })}
                      onBlur={() => persistQuestion(q.id, { prompt: d.prompt })}
                      rows={2}
                      placeholder="Question prompt"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <input
                      value={d.answer_guide}
                      onChange={(e) => patchQuestion(q.id, { answer_guide: e.target.value })}
                      onBlur={() => persistQuestion(q.id, { answer_guide: d.answer_guide })}
                      placeholder="Answer guide (optional)"
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs font-semibold text-gray-500">Marks:</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={d.marks}
                        onChange={(e) => patchQuestion(q.id, { marks: e.target.value })}
                        onBlur={() => persistQuestion(q.id, { marks: d.marks })}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                      <Badge tone="indigo">{d.marks} marks</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {addingQuestionFor === section.id ? (
            <div className="mt-4 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700">New question</span>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  onClick={() => setAddingQuestionFor(null)}
                >
                  Cancel
                </Button>
              </div>
              <textarea
                value={(newQuestions[section.id] || {}).prompt || ""}
                onChange={(e) =>
                  setNewQuestions((m) => ({ ...m, [section.id]: { ...(m[section.id] || {}), prompt: e.target.value } }))
                }
                rows={2}
                placeholder="Question prompt"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <input
                value={(newQuestions[section.id] || {}).answer_guide || ""}
                onChange={(e) =>
                  setNewQuestions((m) => ({ ...m, [section.id]: { ...(m[section.id] || {}), answer_guide: e.target.value } }))
                }
                placeholder="Answer guide (optional)"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500">Marks:</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={(newQuestions[section.id] || {}).marks || "1"}
                  onChange={(e) =>
                    setNewQuestions((m) => ({ ...m, [section.id]: { ...(m[section.id] || {}), marks: e.target.value } }))
                  }
                  className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <Button
                className="mt-3"
                disabled={!((newQuestions[section.id] || {}).prompt || "").trim()}
                onClick={() => handleAddQuestion(section.id)}
              >
                <PlusIcon />
                Add question
              </Button>
            </div>
          ) : (
            hasSupabase() && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                onClick={() => setAddingQuestionFor(section.id)}
              >
                <PlusIcon />
                Add question
              </Button>
            )
          )}
        </Card>
      ))}

      {addingSection ? (
        <Card className="border-dashed border-indigo-300 bg-indigo-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">New section</span>
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setAddingSection(false)}>
              Cancel
            </Button>
          </div>
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Section title"
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <input
            value={newSectionInstructions}
            onChange={(e) => setNewSectionInstructions(e.target.value)}
            placeholder="Instructions (optional)"
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <Button className="mt-3" disabled={!newSectionTitle.trim()} onClick={handleAddSection}>
            <PlusIcon />
            Add section
          </Button>
        </Card>
      ) : (
        hasSupabase() && (
          <Button onClick={() => setAddingSection(true)} className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
            <PlusIcon />
            Add section
          </Button>
        )
      )}

      <ConfirmDialog
        open={confirmRemoval !== null}
        title={confirmRemoval?.kind === "section" ? "Delete section" : "Delete question"}
        message={
          confirmRemoval?.kind === "section"
            ? "Delete this section and all its questions?"
            : "Delete this question?"
        }
        confirmLabel="Delete"
        variant="danger"
        busy={removalBusy}
        onConfirm={() => {
          if (!confirmRemoval) return;
          if (confirmRemoval.kind === "section") {
            handleRemoveSection(confirmRemoval.id);
          } else {
            handleRemoveQuestion(confirmRemoval.id);
          }
        }}
        onClose={() => {
          if (!removalBusy) setConfirmRemoval(null);
        }}
      />
    </Shell>
  );
}