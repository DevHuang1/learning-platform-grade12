"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Spinner } from "@/components/ui";
import { SUBJECTS } from "@/lib/constants";
import {
  deleteSchedule,
  fetchSchedules,
  insertSchedule,
  updateSchedule,
} from "@/lib/db";
import type { ExamScheduleRow } from "@/lib/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function dayOfWeek(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function formatLongDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null) {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  return `${parts[0]}:${parts[1]}`;
}

function dateBadge(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return { month: MONTHS[d.getMonth()], day: d.getDate() };
}

type Status = "today" | "upcoming" | "passed";

function statusOf(examDate: string): Status {
  const today = todayKey();
  if (examDate === today) return "today";
  return examDate > today ? "upcoming" : "passed";
}

function statusBadge(status: Status) {
  if (status === "today") return <Badge tone="indigo">Today</Badge>;
  if (status === "upcoming") return <Badge tone="amber">Coming soon</Badge>;
  return <Badge tone="gray">Passed</Badge>;
}

function subjectTone(
  subject: string,
): "green" | "red" | "amber" | "gray" | "indigo" {
  switch (subject) {
    case "Chemistry":
      return "amber";
    case "English":
      return "indigo";
    case "Physics":
      return "green";
    case "Maths":
      return "gray";
    default:
      return "gray";
  }
}

const EMPTY_FORM = {
  title: "",
  subject: "",
  announcement: "",
  exam_date: "",
  start_time: "",
  end_time: "",
  location: "",
};

export default function SchedulePage() {
  const { user, profile, loading: authLoading, configured } = useAuth();
  const { success, error } = useToast();
  const [schedules, setSchedules] = useState<ExamScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    | { kind: "deactivate"; id: number }
    | { kind: "delete"; id: number }
    | null
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const isTeacher = profile?.role === "teacher";

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const data = await fetchSchedules(true);
    setSchedules(
      data.sort((a, b) =>
        a.exam_date === b.exam_date
          ? (a.start_time || "").localeCompare(b.start_time || "")
          : a.exam_date.localeCompare(b.exam_date),
      ),
    );
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    load();
  }, [load]);

  const upcoming = schedules
    .filter((s) => statusOf(s.exam_date) !== "passed")
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const past = schedules
    .filter((s) => statusOf(s.exam_date) === "passed")
    .sort((a, b) => b.exam_date.localeCompare(a.exam_date));

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(s: ExamScheduleRow) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      subject: s.subject,
      announcement: s.announcement,
      exam_date: s.exam_date,
      start_time: s.start_time ? s.start_time.slice(0, 5) : "",
      end_time: s.end_time ? s.end_time.slice(0, 5) : "",
      location: s.location || "",
    });
    setManageOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setBusy(true);
    try {
      if (editingId != null) {
        await updateSchedule(editingId, {
          title: form.title,
          subject: form.subject,
          announcement: form.announcement,
          exam_date: form.exam_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location || null,
        });
        success("Schedule updated", form.title);
      } else {
        await insertSchedule({
          title: form.title,
          subject: form.subject,
          announcement: form.announcement,
          exam_date: form.exam_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location || null,
        });
        success("Exam schedule added", form.title);
      }
      resetForm();
      await load();
    } catch (err) {
      error(
        "Failed to save schedule",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(id: number) {
    setConfirmBusy(true);
    try {
      await updateSchedule(id, { is_active: false });
      success("Schedule disabled", "This schedule is now hidden from students.");
      await load();
    } catch (err) {
      error(
        "Failed to disable schedule",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setConfirmBusy(false);
      setConfirmAction(null);
    }
  }

  async function handleDelete(id: number) {
    setConfirmBusy(true);
    try {
      await deleteSchedule(id);
      success("Schedule deleted", "The exam schedule was removed.");
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      error(
        "Failed to delete schedule",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setConfirmBusy(false);
      setConfirmAction(null);
    }
  }

  return (
    <Shell>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                Upcoming Exams
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                <CalendarIcon className="h-3.5 w-3.5" />
                {upcoming.length} upcoming
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Official announcements for G12 exams and tests.
            </p>
          </div>
          {configured && isTeacher && (
            <Button variant="secondary" onClick={() => setManageOpen((o) => !o)}>
              {manageOpen ? "Hide" : "Show"} Manage schedules (teacher)
            </Button>
          )}
        </div>

        {configured && authLoading === false && !user && (
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-indigo-200 bg-indigo-50">
            <p className="text-sm font-medium text-indigo-900">
              Sign in to stay notified about upcoming exams.
            </p>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </Card>
        )}

        {configured && authLoading === false && isTeacher && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-500">
            <PlusIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            Teachers can manage schedules here — use the button above to open
            the form.
          </div>
        )}

        {!configured && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <p className="text-sm font-semibold text-amber-800">
              Supabase is not configured
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Exam schedules need Supabase. Set{" "}
              <code className="rounded bg-amber-100 px-1">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              and{" "}
              <code className="rounded bg-amber-100 px-1">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              to see exam announcements.
            </p>
          </Card>
        )}

        {manageOpen && configured && isTeacher && (
          <Card className="mb-6">
            <h3 className="text-base font-bold text-gray-900">
              {editingId != null ? "Edit schedule" : "Add a schedule"}
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              Announce an upcoming exam to your students.
            </p>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  Title
                </span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="e.g. Unit 5 Mock Test"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  Subject
                </span>
                <select
                  required
                  value={form.subject}
                  onChange={(e) => setField("subject", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  {form.subject === "" && (
                    <option value="" disabled>
                      Select a subject…
                    </option>
                  )}
                  {form.subject !== "" &&
                    !(SUBJECTS as readonly string[]).includes(form.subject) && (
                      <option value={form.subject}>{form.subject}</option>
                    )}
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  Announcement
                </span>
                <textarea
                  required
                  value={form.announcement}
                  onChange={(e) => setField("announcement", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Details students need to know before the exam…"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  Date
                </span>
                <input
                  required
                  type="date"
                  value={form.exam_date}
                  onChange={(e) => setField("exam_date", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  Location
                </span>
                <input
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="e.g. Room 4B"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  Start time
                </span>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setField("start_time", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">
                  End time
                </span>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setField("end_time", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <Spinner />
                  ) : editingId != null ? (
                    <PencilIcon className="h-4 w-4" />
                  ) : (
                    <PlusIcon className="h-4 w-4" />
                  )}
                  {busy
                    ? "Saving…"
                    : editingId != null
                      ? "Update schedule"
                      : "Announce exam"}
                </Button>
                {editingId != null && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setConfirmAction({ kind: "deactivate", id: editingId })}
                      disabled={busy}
                    >
                      Deactivate
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetForm}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <ScheduleSkeleton />
        ) : schedules.length === 0 ? (
          <EmptyState
            title="No exams scheduled yet"
            description={
              isTeacher
                ? "Add one using the form below to announce an upcoming exam."
                : "Check back soon — your teacher will announce the next exam here."
            }
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-4">
                {upcoming.map((s) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    status={statusOf(s.exam_date)}
                    manageOpen={manageOpen && configured && isTeacher}
                    onEdit={() => startEdit(s)}
                    onDeactivate={() => setConfirmAction({ kind: "deactivate", id: s.id })}
                    onDelete={() => setConfirmAction({ kind: "delete", id: s.id })}
                  />
                ))}
              </div>
            )}
            {past.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">
                  Past Exams
                </h3>
                <div className="space-y-4 opacity-70">
                  {past.map((s) => (
                    <ScheduleCard
                      key={s.id}
                      schedule={s}
                      status="passed"
                      manageOpen={manageOpen && configured && isTeacher}
                      onEdit={() => startEdit(s)}
                      onDeactivate={() => setConfirmAction({ kind: "deactivate", id: s.id })}
                      onDelete={() => setConfirmAction({ kind: "delete", id: s.id })}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.kind === "delete" ? "Delete schedule" : "Deactivate schedule"}
        message={
          confirmAction?.kind === "delete"
            ? "Delete this schedule permanently?"
            : "Deactivate this schedule? It will be hidden from students."
        }
        confirmLabel={confirmAction?.kind === "delete" ? "Delete" : "Deactivate"}
        variant={confirmAction?.kind === "delete" ? "danger" : "primary"}
        busy={confirmBusy}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.kind === "delete") {
            handleDelete(confirmAction.id);
          } else {
            handleDeactivate(confirmAction.id);
          }
        }}
        onClose={() => {
          if (!confirmBusy) setConfirmAction(null);
        }}
      />
    </Shell>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex gap-4">
            <div className="h-16 w-16 shrink-0 rounded-xl bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-gray-200" />
              <div className="h-3 w-1/3 rounded bg-gray-200" />
              <div className="h-16 rounded-xl bg-indigo-50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleCard({
  schedule,
  status,
  manageOpen,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  schedule: ExamScheduleRow;
  status: Status;
  manageOpen: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const badge = dateBadge(schedule.exam_date);
  const timeRange =
    schedule.start_time || schedule.end_time
      ? `${formatTime(schedule.start_time)} – ${formatTime(schedule.end_time)}`
      : null;

  return (
    <Card className="relative">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <span className="text-lg font-bold leading-none">{badge.day}</span>
          <span className="mt-0.5 text-xs font-semibold uppercase">
            {badge.month}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">
              {schedule.title}
            </h3>
            <Badge tone={subjectTone(schedule.subject)}>
              {schedule.subject}
            </Badge>
            {statusBadge(status)}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {dayOfWeek(schedule.exam_date)}
            </span>
            {" · "}
            {formatLongDate(schedule.exam_date)}
            {timeRange && (
              <>
                {" · "}
                <span className="font-medium text-gray-700">{timeRange}</span>
              </>
            )}
            {schedule.location && <> · {schedule.location}</>}
          </p>
          <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">
              <MegaphoneIcon className="h-3.5 w-3.5" />
              Announcement
            </p>
            <p className="whitespace-pre-line text-sm text-indigo-900">
              {schedule.announcement}
            </p>
          </div>
        </div>
      </div>
      {manageOpen && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={onDeactivate}>
            <PowerIcon className="h-3.5 w-3.5" />
            Deactivate
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <TrashIcon className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}
    </Card>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
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
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function PowerIcon({ className }: { className?: string }) {
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
      <path d="M12 2v10" />
      <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
