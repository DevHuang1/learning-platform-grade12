"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Shell from "@/components/Shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  StatBox,
} from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { SUBJECTS } from "@/lib/constants";
import {
  accuracySeries,
  computeMetrics,
  modeBreakdown,
  shortLabel,
  submissionScore,
  unitProgress,
} from "@/lib/analytics";
import {
  fetchExamSheet,
  fetchExamSheets,
  fetchMySubmissions,
  fetchQuizHistory,
  fetchSchedules,
  fetchSubmissions,
  fetchVocabUnits,
} from "@/lib/db";
import { hasSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type {
  ExamScheduleRow,
  ExamSheetRow,
  ExamSubmissionRow,
  QuizHistoryRow,
} from "@/lib/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ONBOARD_KEY = "g12_onboard_done";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function dateBadge(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return { month: MONTHS[d.getMonth()], day: d.getDate() };
}

function statusTone(status: ExamSubmissionRow["status"]) {
  return status === "graded" ? "green" : "amber";
}

function subjectTone(subject: string) {
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

function BoltIcon({ className }: { className?: string }) {
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
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
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
      <path d="m9 14 2 2 4-4" />
    </svg>
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

function BookIcon({ className }: { className?: string }) {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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

function FlameIcon({ className }: { className?: string }) {
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
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
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
      <path d="M12 6v6l4 2" />
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
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

export default function DashboardPage() {
  const { user, profile, loading: authLoading, configured } = useAuth();
  const isTeacher = profile?.role === "teacher";
  const { info } = useToast();
  const notifiedRef = useRef(false);

  const [history, setHistory] = useState<QuizHistoryRow[]>([]);
  const [schedules, setSchedules] = useState<ExamScheduleRow[]>([]);
  const [sheets, setSheets] = useState<ExamSheetRow[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmissionRow[]>([]);
  const [unitTitles, setUnitTitles] = useState<Map<number, string> | null>(null);
  const [sheetDetails, setSheetDetails] = useState<
    Record<number, { title: string; total: number; subject: string }>
  >({});
  const [busy, setBusy] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [onboardDone, setOnboardDone] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(ONBOARD_KEY) === "1";
  });

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const limit = isTeacher ? 500 : 200;
    Promise.all([
      fetchQuizHistory(limit, isTeacher ? undefined : user.id),
      fetchSchedules(),
      isTeacher ? fetchSubmissions() : fetchMySubmissions(user.id),
      fetchExamSheets(),
      fetchVocabUnits(),
    ])
      .then(async ([hist, scheds, subs, sheetRows, vocabUnits]) => {
        const sheetById = new Map(sheetRows.map((s) => [s.id, s]));
        const details: Record<
          number,
          { title: string; total: number; subject: string }
        > = {};
        for (const sub of subs.slice(0, 3)) {
          const row = sheetById.get(sub.sheet_id);
          if (!row) continue;
          const full = await fetchExamSheet(sub.sheet_id);
          details[sub.sheet_id] = {
            title: row.title,
            total: full?.total_marks ?? 0,
            subject: row.subject ?? "",
          };
        }
        if (cancelled) return;
        setHistory(hist);
        setSchedules(scheds);
        setSubmissions(subs);
        setSheets(sheetRows);
        setSheetDetails(details);
        setUnitTitles(new Map(vocabUnits.map((u) => [u.unit_number, u.title])));
        setBusy(false);
      })
      .catch(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configured, authLoading, user, isTeacher]);

  const metrics = useMemo(() => computeMetrics(history), [history]);
  const accuracyData = useMemo(
    () =>
      accuracySeries(history, 14).map((d) => ({
        ...d,
        label: shortLabel(d.date),
      })),
    [history],
  );
  const modeData = useMemo(() => {
    const m = modeBreakdown(history);
    return [
      { name: "Blank", value: m.blank, color: "#117a6d" },
      { name: "Meaning", value: m.meaning, color: "#d99220" },
    ];
  }, [history]);
  const units = useMemo(
    () => unitProgress(history, unitTitles ?? undefined),
    [history, unitTitles],
  );

  const upcoming = useMemo(
    () =>
      schedules
        .filter((s) => s.exam_date >= localToday())
        .filter(
          (s) => subjectFilter === "All" || s.subject === subjectFilter,
        )
        .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
        .slice(0, 3),
    [schedules, subjectFilter],
  );

  const recentResults = useMemo(
    () =>
      submissions.slice(0, 3).map((sub) => {
        const detail = sheetDetails[sub.sheet_id];
        const score = submissionScore(sub, detail?.total ?? 0);
        return {
          sub,
          title: detail?.title ?? `Sheet #${sub.sheet_id}`,
          obtained: score.obtained,
          total: detail?.total ?? 0,
          pct: score.pct,
          subject: detail?.subject ?? "",
        };
      }),
    [submissions, sheetDetails],
  );

  const teacherStats = useMemo(
    () => ({
      total: submissions.length,
      pending: submissions.filter((s) => s.status === "submitted").length,
      scheduled: schedules.length,
      published: sheets.filter((s) => s.status === "published").length,
    }),
    [submissions, schedules, sheets],
  );

  useEffect(() => {
    if (!busy && isTeacher && teacherStats.pending > 0 && !notifiedRef.current) {
      notifiedRef.current = true;
      info(
        `${teacherStats.pending} ${
          teacherStats.pending === 1 ? "submission" : "submissions"
        } awaiting grading`,
        "Open the Students tab to review and grade them.",
      );
    }
  }, [busy, isTeacher, teacherStats.pending, info]);

  const firstName =
    profile?.full_name?.split(" ").filter(Boolean)[0] ?? "";
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const summary = history.length
    ? `You've answered ${metrics.total} words with ${metrics.accuracy}% accuracy — keep it up!`
    : "Start practicing to see your learning analytics.";

  const signedOut = !authLoading && !user && !busy;

  const showOnboard =
    !isTeacher &&
    !onboardDone &&
    history.length === 0 &&
    submissions.length === 0;

  function dismissOnboard() {
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {}
    setOnboardDone(true);
  }

  return (
    <Shell>
      {!configured ? (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800">
            Running offline — analytics disabled
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-700">
            The Quiz still works locally, but saving progress and analytics need
            Supabase. Add{" "}
            <code className="rounded bg-amber-100 px-1">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-amber-100 px-1">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            to your{" "}
            <code className="rounded bg-amber-100 px-1">.env.local</code> file,
            then restart the dev server.
          </p>
        </Card>
      ) : signedOut ? (
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
            <h2 className="mt-4 text-lg font-bold text-gray-900">
              Please sign in
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to see your learning analytics, exam schedule and results.
            </p>
            <Link href="/login" className="mt-4 inline-block">
              <Button>Go to sign in</Button>
            </Link>
          </Card>
        </div>
      ) : busy ? (
        <div className="space-y-4">
          <Card>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-3 h-4 w-72" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-36" />
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="mx-auto h-8 w-16" />
                <Skeleton className="mx-auto mt-2 h-3 w-24" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-4 h-60" />
              </Card>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-4 h-52" />
                </Card>
                <Card>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-4 h-5" />
                  <Skeleton className="mt-2 h-5" />
                  <Skeleton className="mt-2 h-5" />
                  <Skeleton className="mt-2 h-5" />
                </Card>
              </div>
            </div>
            <div className="space-y-4">
              <Card>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-3 h-20" />
                <Skeleton className="mt-2 h-20" />
                <Skeleton className="mt-2 h-20" />
              </Card>
              <Card>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-3 h-14" />
                <Skeleton className="mt-2 h-14" />
                <Skeleton className="mt-2 h-14" />
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {greeting()}, {firstName || "there"} 👋
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {todayLabel} · {isTeacher ? "Teacher overview" : "Your progress"}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  {summary}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/quiz">
                  <Button size="md">
                    <BoltIcon className="h-4 w-4" />
                    Start a Quiz
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/exam">
                  <Button variant="secondary" size="md">
                    <ClipboardIcon className="h-4 w-4 text-gray-500" />
                    View Exams
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button variant="secondary" size="md">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    View Schedule
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {showOnboard && (
            <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-accent-600 p-5 text-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Getting started</h2>
                  <p className="mt-0.5 text-sm text-brand-100">
                    Three easy steps to start learning on G12.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissOnboard}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/quiz">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/15 text-white hover:bg-white/25"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Take a quiz
                  </Button>
                </Link>
                <Link href="/exam">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/15 text-white hover:bg-white/25"
                  >
                    <CheckIcon className="h-4 w-4" />
                    View exams
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/15 text-white hover:bg-white/25"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Check schedule
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {isTeacher && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatBox
                label="Total submissions"
                value={teacherStats.total}
                icon={<ClipboardIcon className="h-4 w-4 text-indigo-500" />}
              />
              <StatBox
                label="Pending grading"
                value={teacherStats.pending}
                accent={
                  teacherStats.pending > 0
                    ? "text-amber-600"
                    : "text-emerald-600"
                }
                icon={
                  <ClockIcon
                    className={cn(
                      "h-4 w-4",
                      teacherStats.pending > 0
                        ? "text-amber-500"
                        : "text-emerald-500",
                    )}
                  />
                }
              />
              <StatBox
                label="Scheduled exams"
                value={teacherStats.scheduled}
                icon={<CalendarIcon className="h-4 w-4 text-indigo-500" />}
              />
              <StatBox
                label="Published exams"
                value={teacherStats.published}
                accent="text-indigo-600"
                icon={<CheckCircleIcon className="h-4 w-4 text-indigo-500" />}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatBox
              label="Words answered"
              value={metrics.total}
              icon={<BookIcon className="h-4 w-4 text-indigo-500" />}
            />
            <StatBox
              label="Accuracy"
              value={`${metrics.accuracy}%`}
              accent="text-indigo-600"
              icon={<TargetIcon className="h-4 w-4 text-indigo-500" />}
            />
            <StatBox
              label="Current streak"
              value={metrics.streak}
              accent={metrics.streak > 0 ? "text-emerald-600" : undefined}
              icon={
                <FlameIcon
                  className={cn(
                    "h-4 w-4",
                    metrics.streak > 0 ? "text-emerald-500" : "text-gray-400",
                  )}
                />
              }
            />
            <StatBox
              label="Today's activity"
              value={metrics.todayTotal}
              accent={
                metrics.todayTotal > 0 ? "text-indigo-600" : undefined
              }
              icon={
                <BoltIcon
                  className={cn(
                    "h-4 w-4",
                    metrics.todayTotal > 0 ? "text-indigo-500" : "text-gray-400",
                  )}
                />
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Accuracy trend
                    </h3>
                    <p className="text-xs text-gray-400">Last 14 days</p>
                  </div>
                  <Badge tone="indigo">{metrics.accuracy}% overall</Badge>
                </div>
                {history.length === 0 ? (
                  <EmptyState
                    title="No practice yet"
                    description="Start practicing — your accuracy trend will appear here."
                    className="h-60"
                    action={
                      <Link href="/quiz">
                        <Button variant="secondary" size="sm">
                          Start a Quiz
                        </Button>
                      </Link>
                    }
                  />
                ) : (
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={accuracyData}
                        margin={{ top: 5, right: 5, left: -12, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="accuracyGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#117a6d"
                              stopOpacity={0.32}
                            />
                            <stop
                              offset="100%"
                              stopColor="#117a6d"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e7e5e4"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#a8a29e" }}
                          axisLine={false}
                          tickLine={false}
                          interval={1}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 11, fill: "#a8a29e" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e7e5e4",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                            fontSize: 12,
                          }}
                          formatter={(value) => [`${value}%`, "Accuracy"]}
                          labelStyle={{ fontWeight: 600 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="pct"
                          stroke="#117a6d"
                          strokeWidth={2}
                          fill="url(#accuracyGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <h3 className="text-sm font-bold text-gray-900">
                    Mode breakdown
                  </h3>
                  <p className="text-xs text-gray-400">Blank vs Meaning</p>
                  {history.length === 0 ? (
                    <EmptyState
                      title="No practice yet"
                      description="Take a quiz to see your Blank vs Meaning split."
                      className="mt-2 h-48 py-4"
                      action={
                        <Link href="/quiz">
                          <Button variant="secondary" size="sm">
                            Start a Quiz
                          </Button>
                        </Link>
                      }
                    />
                  ) : (
                    <div className="mt-2 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={modeData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={42}
                            outerRadius={68}
                            paddingAngle={3}
                            strokeWidth={2}
                          >
                            {modeData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e7e5e4",
                              fontSize: 12,
                            }}
                          />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>

                <Card>
                  <h3 className="text-sm font-bold text-gray-900">
                    Unit mastery
                  </h3>
                  <p className="text-xs text-gray-400">Accuracy per unit</p>
                  {units.length === 0 ? (
                    <EmptyState
                      title="No unit data yet"
                      description="Answer a few questions per unit to see your mastery here."
                      className="mt-4 rounded-2xl border-dashed bg-transparent py-6"
                      action={
                        <Link href="/quiz">
                          <Button variant="ghost" size="sm">
                            Start a Quiz
                          </Button>
                        </Link>
                      }
                    />
                  ) : (
                    <div className="mt-4 space-y-3">
                      {units.map((u) => (
                        <div key={u.unit}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                              {u.title}
                            </span>
                            <span className="shrink-0 text-xs text-gray-400">
                              {u.correct}/{u.total} · {u.pct}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
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
                </Card>
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Upcoming exams
                  </h3>
                  <Link href="/schedule">
                    <span className="text-xs font-semibold text-indigo-600 hover:underline">
                      View all
                    </span>
                  </Link>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["All", ...SUBJECTS].map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setSubjectFilter(subject)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                        subjectFilter === subject
                          ? "bg-indigo-600 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200",
                      )}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
                {subjectFilter !== "All" && upcoming.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    No {subjectFilter} exams announced yet. Check back soon.
                  </p>
                ) : upcoming.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    No exams announced yet. Check back soon.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {upcoming.map((s) => {
                      const badge = dateBadge(s.exam_date);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                        >
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-600 text-white">
                            <span className="text-sm font-bold leading-none">
                              {badge.day}
                            </span>
                            <span className="text-[10px] font-semibold uppercase">
                              {badge.month}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {s.title}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              {s.start_time ? `${s.start_time}` : ""}
                            </p>
                          </div>
                          <Badge
                            tone={subjectTone(s.subject)}
                            className="shrink-0"
                          >
                            {s.subject}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Recent results
                  </h3>
                  <Link href="/result">
                    <span className="text-xs font-semibold text-indigo-600 hover:underline">
                      View all
                    </span>
                  </Link>
                </div>
                {recentResults.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    No exam submissions yet. Head to the Exams tab when you're
                    ready.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {recentResults.map(
                      ({ sub, title, obtained, total, pct, subject }) => (
                        <div
                          key={sub.id}
                          className="rounded-xl border border-gray-200 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="min-w-0 truncate text-sm font-semibold text-gray-900">
                                {title}
                              </p>
                              {subject && (
                                <Badge
                                  tone={subjectTone(subject)}
                                  className="shrink-0"
                                >
                                  {subject}
                                </Badge>
                              )}
                            </div>
                            <Badge
                              tone={statusTone(sub.status)}
                              className="shrink-0"
                            >
                              {sub.status === "graded"
                                ? "Graded"
                                : "Submitted"}
                            </Badge>
                          </div>
                        <div className="mt-1 flex items-baseline justify-between gap-2">
                          <span className="text-xs text-gray-400">
                            {obtained} / {total || "?"} marks
                          </span>
                          <span
                            className={cn(
                              "text-sm font-bold",
                              pct >= 60
                                ? "text-emerald-600"
                                : pct > 0
                                  ? "text-amber-600"
                                  : "text-red-600",
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}