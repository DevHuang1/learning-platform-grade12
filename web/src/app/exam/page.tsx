"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { fetchExamSheets, fetchExamSheet } from "@/lib/db";
import { hasSupabase } from "@/lib/supabase";
import type { ExamWithSections } from "@/lib/types";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function WrenchIcon() {
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
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function ExamPage() {
  const { user, profile } = useAuth();
  const [sheets, setSheets] = useState<ExamWithSections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const isTeacher = profile?.role === "teacher";
  const displayName = profile?.full_name || user?.email?.split("@")[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sheets;
    return sheets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q),
    );
  }, [sheets, query]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!hasSupabase()) {
        setLoading(false);
        return;
      }
      try {
        const list = await fetchExamSheets("published");
        const full = await Promise.all(list.map((s) => fetchExamSheet(s.id)));
        if (!cancelled) setSheets(full.filter((s): s is ExamWithSections => s !== null));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load exams");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Exams</h2>
          <p className="text-sm text-gray-500">Pick an exam sheet and take it</p>
        </div>
        {isTeacher && (
          <Link href="/exam/build">
            <Button variant="secondary">
              <WrenchIcon />
              Build a Sheet
            </Button>
          </Link>
        )}
      </div>

      {!hasSupabase() && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-700">
            Supabase is not configured
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Exams can&apos;t be loaded from the database. Set
            NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable.
          </p>
        </Card>
      )}

      {!user && (
        <Card className="mb-4 border-indigo-200 bg-indigo-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                Sign in to take exams
              </p>
              <p className="mt-1 text-sm text-indigo-600">
                You can keep browsing, but your answers and results will only be
                saved if you&apos;re signed in.
              </p>
            </div>
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </div>
        </Card>
      )}

      {user && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50">
          <p className="text-sm font-semibold text-emerald-700">
            Signed in as {displayName || user.email}
          </p>
          <p className="mt-1 text-sm text-emerald-600">
            Pick a published exam below and take it. Your grades will be linked
            to your account.
          </p>
        </Card>
      )}

      {isTeacher && (
        <Card className="mb-4 border-violet-200 bg-violet-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-violet-700">
                Teacher tools
              </p>
              <p className="mt-1 text-sm text-violet-600">
                Build new exam sheets, publish them for students, or manage an
                existing sheet.
              </p>
            </div>
            <Link href="/exam/build">
              <Button variant="secondary">
                <WrenchIcon />
                Open Exam Builder
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {loading && <p className="text-sm text-gray-500">Loading exams…</p>}

      {error && <Card className="mb-4 border-red-200 bg-red-50">{error}</Card>}

      {!loading && !error && filtered.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or subject…"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          title={
            query.trim()
              ? "No exams match your search"
              : "No published exams — check back soon"
          }
          description={
            query.trim()
              ? "Try a different title or subject keyword."
              : "Teachers can build a sheet first, then publish it so students can take it."
          }
          action={
            isTeacher && !query.trim() ? (
              <Link href="/exam/build">
                <Button>Build a Sheet</Button>
              </Link>
            ) : undefined
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((s) => (
          <Card
            key={s.id}
            className="flex flex-col gap-3 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.subject}</p>
              </div>
              <Badge tone={s.status === "published" ? "green" : "amber"}>
                {s.status}
              </Badge>
            </div>
            {s.description && (
              <p className="text-sm text-gray-600">{s.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold">
                {s.duration_minutes} min
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold">
                {s.question_count} questions
              </span>
              <Badge tone="indigo">{s.total_marks} marks</Badge>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link href={`/exam/${s.id}`} className="flex-1">
                <Button className="w-full">
                  <PlayIcon />
                  Take Exam
                </Button>
              </Link>
              {isTeacher && (
                <Link href={`/exam/build/${s.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    <WrenchIcon />
                    Manage
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}