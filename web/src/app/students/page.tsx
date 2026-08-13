"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/toast";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  Spinner,
  StatBox,
} from "@/components/ui";
import { computeMetrics, dayKey, submissionScore, unitProgress } from "@/lib/analytics";
import {
  fetchAllQuizHistory,
  fetchAllStudents,
  fetchExamSheet,
  fetchExamSheets,
  fetchSubmissionsForUsers,
  updateStudentRole,
} from "@/lib/db";
import { cn } from "@/lib/utils";
import type { ExamSubmissionRow, ProfileRow, QuizHistoryRow } from "@/lib/types";

type StudentStat = {
  student: ProfileRow;
  metrics: ReturnType<typeof computeMetrics>;
  activeToday: boolean;
  lastActive: string | null;
  submissions: ExamSubmissionRow[];
  bestPct: number | null;
};

function daysAgo(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function lastActiveLabel(iso: string | null) {
  if (!iso) return "No activity";
  const d = daysAgo(iso);
  if (d <= 0) return "Today";
  return d === 1 ? "Last active 1d ago" : `Last active ${d}d ago`;
}

function accuracyTone(accuracy: number): "green" | "indigo" | "amber" {
  if (accuracy > 80) return "green";
  if (accuracy > 50) return "indigo";
  return "amber";
}

function joinedDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 md:hidden">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function StudentsPage() {
  const { user, profile, loading: authLoading, configured } = useAuth();
  const { success, error } = useToast();
  const isTeacher = profile?.role === "teacher";

  const [students, setStudents] = useState<ProfileRow[]>([]);
  const [history, setHistory] = useState<QuizHistoryRow[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmissionRow[]>([]);
  const [sheetTitles, setSheetTitles] = useState<Record<number, string>>({});
  const [sheetTotal, setSheetTotal] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<ProfileRow | null>(null);
  const [promoteBusy, setPromoteBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [studs, hist, sheets] = await Promise.all([
        fetchAllStudents(),
        fetchAllQuizHistory(20000),
        fetchExamSheets(),
      ]);
      const subs = await fetchSubmissionsForUsers(studs.map((s) => s.id));
      const sheetIds = [...new Set(subs.map((sub) => sub.sheet_id))];
      const details = await Promise.all(sheetIds.map((id) => fetchExamSheet(id)));
      const totals: Record<number, number> = {};
      for (const d of details) {
        if (!d) continue;
        totals[d.id] = d.total_marks;
      }
      const titles: Record<number, string> = {};
      for (const s of sheets) titles[s.id] = s.title;
      setStudents(studs);
      setHistory(hist);
      setSubmissions(subs);
      setSheetTotal(totals);
      setSheetTitles(titles);
    } catch {
      error("Couldn't load student data", "Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!configured || authLoading || !user || !isTeacher) {
      setLoading(false);
      return;
    }
    load();
  }, [configured, authLoading, user, isTeacher]);

  const stats = useMemo<StudentStat[]>(() => {
    const today = dayKey(new Date());
    return students.map((s) => {
      const hist = history.filter((h) => h.user_id === s.id);
      const subs = submissions.filter((sub) => sub.user_id === s.id);
      const metrics = computeMetrics(hist);
      const subActiveToday = subs.some((sub) => dayKey(new Date(sub.created_at)) === today);
      let bestPct: number | null = null;
      for (const sub of subs) {
        const pct = submissionScore(sub, sheetTotal[sub.sheet_id] ?? 0).pct;
        if (bestPct === null || pct > bestPct) bestPct = pct;
      }
      let lastActive: string | null = null;
      for (const c of [hist[0]?.created_at, subs[0]?.created_at]) {
        if (c && (!lastActive || c > lastActive)) lastActive = c;
      }
      return {
        student: s,
        metrics,
        activeToday: metrics.todayTotal > 0 || subActiveToday,
        lastActive,
        submissions: subs,
        bestPct,
      };
    });
  }, [students, history, submissions, sheetTotal]);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      stats.filter(
        (s) =>
          !query ||
          s.student.full_name.toLowerCase().includes(query) ||
          s.student.email.toLowerCase().includes(query),
      ),
    [stats, query],
  );

  const activeTodayCount = stats.filter((s) => s.activeToday).length;
  const avgAccuracy = stats.length
    ? Math.round(stats.reduce((acc, s) => acc + s.metrics.accuracy, 0) / stats.length)
    : 0;
  const pendingGrading = submissions.filter((sub) => sub.status === "submitted").length;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function makeTeacher(s: ProfileRow) {
    setPromoteBusy(true);
    try {
      await updateStudentRole(s.id, "teacher");
      success(`${s.full_name} is now a teacher`);
      await load();
    } catch {
      error("Couldn't update role", "Please try again.");
    } finally {
      setPromoteBusy(false);
      setPromoteTarget(null);
    }
  }

  if (!configured) {
    return (
      <Shell>
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800">Supabase is not configured</p>
          <p className="mt-1 text-sm leading-6 text-amber-700">
            Student analytics need a Supabase backend. Add{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
            your <code className="rounded bg-amber-100 px-1">.env.local</code> file, then restart
            the dev server.
          </p>
        </Card>
      </Shell>
    );
  }

  if (authLoading) {
    return (
      <Shell>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Card className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
                <Skeleton className="hidden h-4 w-16 md:block" />
                <Skeleton className="hidden h-8 w-24 rounded-xl md:block" />
              </div>
            ))}
          </Card>
        </div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">Please sign in</h2>
            <p className="mt-1 text-sm text-gray-500">
              Sign in with a teacher account to view and manage your students.
            </p>
            <Link href="/login" className="mt-4 inline-block">
              <Button>Go to sign in</Button>
            </Link>
          </Card>
        </div>
      </Shell>
    );
  }

  if (!isTeacher) {
    return (
      <Shell>
        <Card className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-gray-900">Teachers only</h2>
          <p className="mt-1 text-sm text-gray-500">
            This page is for managing students. Ask your teacher to sign in with a teacher
            account.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/quiz">
              <Button variant="secondary">Back to Quiz</Button>
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Students</h1>
            <p className="mt-1 text-sm text-gray-500">
              {students.length} students enrolled · {activeTodayCount} active today
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:text-sm"
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatBox
            label="Total students"
            value={students.length}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            }
          />
          <StatBox
            label="Active today"
            value={activeTodayCount}
            accent={activeTodayCount > 0 ? "text-emerald-600" : undefined}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />
          <StatBox
            label="Avg accuracy"
            value={`${avgAccuracy}%`}
            accent="text-indigo-600"
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            }
          />
          <StatBox
            label="Pending grading"
            value={pendingGrading}
            accent={pendingGrading > 0 ? "text-amber-600" : "text-emerald-600"}
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            }
          />
        </div>

        <Card className="p-2 sm:p-3">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                  </div>
                  <Skeleton className="hidden h-4 w-16 md:block" />
                  <Skeleton className="hidden h-8 w-24 rounded-xl md:block" />
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No students enrolled yet"
                description="Share the sign-up link with your students to get started."
                action={
                  <Link href="/register">
                    <Button variant="secondary" className="px-3 py-1.5 text-xs">
                      Get sign-up link
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No students match your search"
                description={`No students found for "${search}". Try a different name or email.`}
              />
            </div>
          ) : (
            <div>
              {filtered.map((s) => {
                const isOpen = expanded.has(s.student.id);
                const m = s.metrics;
                const units = unitProgress(history.filter((h) => h.user_id === s.student.id));
                return (
                  <div key={s.student.id} className="border-b border-gray-100 last:border-b-0">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggle(s.student.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(s.student.id);
                        }
                      }}
                      className={cn(
                        "grid cursor-pointer grid-cols-1 gap-3 rounded-xl p-4 transition-colors hover:bg-gray-50 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1.3fr] md:items-center",
                        isOpen && "bg-indigo-50/40 hover:bg-indigo-50/60",
                      )}
                    >
                      <Cell label="Student" className="md:col-span-1">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.student.full_name} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {s.student.full_name}
                            </p>
                            <p className="truncate text-xs text-gray-400">{s.student.email}</p>
                          </div>
                        </div>
                      </Cell>
                      <Cell label="Joined">
                        <span className="text-sm text-gray-600">
                          {joinedDate(s.student.created_at)}
                        </span>
                      </Cell>
                      <Cell label="Activity">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-gray-600">{m.total} answered</span>
                          <Badge tone={accuracyTone(m.accuracy)}>{m.accuracy}% acc</Badge>
                        </div>
                      </Cell>
                      <Cell label="Best exam">
                        {s.bestPct !== null ? (
                          <Badge tone={s.bestPct >= 60 ? "green" : s.bestPct > 0 ? "indigo" : "amber"}>
                            {s.bestPct}%
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </Cell>
                      <Cell label="Status" className="md:col-span-1">
                        <div className="flex items-center justify-between gap-2">
                          {s.activeToday ? (
                            <Badge tone="green">Active today</Badge>
                          ) : (
                            <span className="text-sm text-gray-500">
                              {lastActiveLabel(s.lastActive)}
                            </span>
                          )}
                          <span className="hidden h-6 w-px bg-gray-200 md:block" />
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={busyId === s.student.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromoteTarget(s.student);
                            }}
                          >
                            {busyId === s.student.id ? <Spinner className="size-3" /> : null}
                            Make teacher
                          </Button>
                        </div>
                      </Cell>
                    </div>

                    {isOpen && (
                      <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50/60 p-4 md:grid-cols-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Practice
                          </p>
                          <dl className="mt-2 space-y-1.5 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <dt className="text-gray-500">Answered</dt>
                              <dd className="font-semibold text-gray-900">{m.total}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt className="text-gray-500">Correct</dt>
                              <dd className="font-semibold text-gray-900">{m.correct}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt className="text-gray-500">Accuracy</dt>
                              <dd className="font-semibold text-gray-900">{m.accuracy}%</dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt className="text-gray-500">Streak</dt>
                              <dd
                                className={cn(
                                  "font-semibold",
                                  m.streak > 0 ? "text-emerald-600" : "text-gray-900",
                                )}
                              >
                                {m.streak}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <dt className="text-gray-500">Today</dt>
                              <dd className="font-semibold text-gray-900">{m.todayTotal}</dd>
                            </div>
                          </dl>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Unit mastery
                          </p>
                          {units.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">No unit practice yet.</p>
                          ) : (
                            <div className="mt-2 space-y-3">
                              {units.slice(0, 6).map((u) => (
                                <div key={u.unit}>
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <span className="min-w-0 truncate text-gray-700">
                                      {u.title}
                                    </span>
                                    <span className="shrink-0 text-gray-400">{u.pct}%</span>
                                  </div>
                                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                                    <div
                                      className={cn(
                                        "h-full rounded-full",
                                        u.pct >= 80
                                          ? "bg-emerald-500"
                                          : u.pct >= 50
                                            ? "bg-indigo-500"
                                            : "bg-amber-500",
                                      )}
                                      style={{ width: `${u.pct}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                            Recent exams
                          </p>
                          {s.submissions.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">No exam submissions yet.</p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {s.submissions.slice(0, 5).map((sub) => {
                                const total = sheetTotal[sub.sheet_id] ?? 0;
                                const pct = submissionScore(sub, total).pct;
                                return (
                                  <div
                                    key={sub.id}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
                                  >
                                    <span className="min-w-0 truncate text-gray-700">
                                      {sheetTitles[sub.sheet_id] || `Sheet #${sub.sheet_id}`}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2">
                                      <span className="font-semibold text-gray-900">{pct}%</span>
                                      <Badge tone={sub.status === "graded" ? "green" : "amber"}>
                                        {sub.status === "graded" ? "Graded" : "Submitted"}
                                      </Badge>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={promoteTarget !== null}
        title="Promote to teacher"
        message={
          promoteTarget
            ? `Make ${promoteTarget.full_name} a teacher? They'll be removed from the student list.`
            : ""
        }
        confirmLabel="Make teacher"
        variant="danger"
        busy={promoteBusy}
        onConfirm={() => {
          if (promoteTarget) makeTeacher(promoteTarget);
        }}
        onClose={() => {
          if (!promoteBusy) setPromoteTarget(null);
        }}
      />
    </Shell>
  );
}