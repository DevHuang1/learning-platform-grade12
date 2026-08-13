"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge, Button, Card, ConfirmDialog, EmptyState, StatBox } from "@/components/ui";
import { deleteExamSheet, fetchExamSheets, insertExamSheet } from "@/lib/db";
import { hasSupabase } from "@/lib/supabase";
import { SUBJECTS } from "@/lib/constants";
import type { ExamSheetRow } from "@/lib/types";

const STATUS_TONE: Record<string, "gray" | "amber" | "green"> = {
  draft: "gray",
  published: "green",
  closed: "amber",
};

const SUBJECT_TONE: Record<string, "green" | "red" | "amber" | "gray" | "indigo"> = {
  Chemistry: "amber",
  English: "indigo",
  Physics: "green",
  Maths: "gray",
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

function SheetIcon() {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function CheckIcon() {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
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
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export default function ExamBuildPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [sheets, setSheets] = useState<ExamSheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ExamSheetRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [subject, setSubject] = useState("All");

  const isTeacher = profile?.role === "teacher";
  const publishedCount = sheets.filter((s) => s.status === "published").length;
  const draftCount = sheets.filter((s) => s.status === "draft").length;

  const filtered = useMemo(() => {
    if (subject === "All") return sheets;
    return sheets.filter((s) => s.subject === subject);
  }, [sheets, subject]);

  async function load() {
    if (!hasSupabase()) {
      setLoading(false);
      return;
    }
    try {
      setSheets(await fetchExamSheets());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sheets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isTeacher) return;
    load();
  }, [isTeacher]);

  async function newSheet() {
    setCreating(true);
    setError(null);
    try {
      const s = await insertExamSheet({
        title: "Untitled Exam",
        subject: "",
        description: "",
        duration_minutes: 60,
        status: "draft",
      });
      if (s) router.push(`/exam/build/${s.id}`);
      else throw new Error("Could not create sheet");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create sheet");
    } finally {
      setCreating(false);
    }
  }

  async function deleteSheet(s: ExamSheetRow) {
    setError(null);
    setDeletingBusy(true);
    try {
      await deleteExamSheet(s.id);
      setSheets((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete sheet");
    } finally {
      setDeletingBusy(false);
      setDeleting(null);
    }
  }

  if (authLoading) {
    return (
      <Shell>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
            <div className="mt-1 h-4 w-56 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-200" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
        </div>
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
              You can&apos;t create or edit exam sheets without a Supabase backend.
            </p>
          </Card>
        )}
        <Card className="mx-auto max-w-md text-center">
          <h2 className="text-lg font-bold text-gray-900">Teachers only</h2>
          <p className="mt-1 text-sm text-gray-500">
            The exam builder is reserved for teachers. Ask your teacher to sign
            in with a teacher account to create and manage exam sheets.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/exam">
              <Button variant="secondary">Take Exams</Button>
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Exam Builder</h2>
          <p className="text-sm text-gray-500">
            Manage and build exam sheets
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/exam">
            <Button variant="secondary">Take Exams</Button>
          </Link>
          <Button onClick={newSheet} disabled={creating || !hasSupabase()}>
            <PlusIcon />
            {creating ? "Creating…" : "New Sheet"}
          </Button>
        </div>
      </div>

      {!hasSupabase() && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-700">
            Supabase is not configured
          </p>
          <p className="mt-1 text-sm text-amber-700">
            You can&apos;t create or edit exam sheets without a Supabase backend.
          </p>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Total Sheets" value={sheets.length} icon={<SheetIcon />} />
        <StatBox
          label="Published"
          value={publishedCount}
          accent="text-emerald-600"
          icon={<CheckIcon />}
        />
        <StatBox
          label="Draft"
          value={draftCount}
          accent="text-amber-600"
          icon={<EditIcon />}
        />
        <StatBox
          label="New Sheet"
          value={
            <Button
              onClick={newSheet}
              disabled={creating || !hasSupabase()}
              className="px-3 py-1 text-xs"
            >
              <PlusIcon />
              Create
            </Button>
          }
          icon={<PlusIcon />}
        />
      </div>

      {error && <Card className="mb-4 border-red-200 bg-red-50">{error}</Card>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      ) : (
        <>
          {sheets.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {["All", ...SUBJECTS].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSubject(sub)}
                  className={
                    subject === sub
                      ? "rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700"
                      : "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  }
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          {sheets.length === 0 && (
            <EmptyState
              className="mb-4"
              title="No exam sheets yet"
              description="Create a new sheet to start building your exam."
              action={
                <Button onClick={newSheet} disabled={!hasSupabase()}>
                  <PlusIcon />
                  New Sheet
                </Button>
              }
            />
          )}

          {filtered.length === 0 && sheets.length > 0 && (
            <Card className="mb-4 border-stone-200 bg-stone-50">
              <p className="text-sm text-gray-600">No sheets in this subject.</p>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((s) => (
              <Card key={s.id} className="flex flex-col gap-3 transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{s.title}</h3>
                    {s.subject ? (
                      <Badge tone={SUBJECT_TONE[s.subject] || "gray"}>
                        {s.subject}
                      </Badge>
                    ) : (
                      <p className="text-sm text-gray-500">No subject</p>
                    )}
                  </div>
                  <Badge tone={STATUS_TONE[s.status] || "gray"}>{s.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold">
                    {s.duration_minutes} min
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                <div className="mt-auto flex gap-2">
                  <Link href={`/exam/build/${s.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      Edit Sheet
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    onClick={() => setDeleting(s)}
                    aria-label={`Delete ${s.title}`}
                    className="px-3"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete sheet"
        message={
          deleting
            ? deleting.status === "published"
              ? `Delete "${deleting.title}"? This permanently removes the sheet, its questions, and all student submissions.`
              : `Delete "${deleting.title}"? This permanently removes the sheet and its questions.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleting) deleteSheet(deleting);
        }}
        onClose={() => {
          if (!deletingBusy) setDeleting(null);
        }}
        busy={deletingBusy}
      />
    </Shell>
  );
}