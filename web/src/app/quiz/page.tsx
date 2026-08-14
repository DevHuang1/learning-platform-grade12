"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge, Button, Card, EmptyState, StatBox } from "@/components/ui";
import { useToast } from "@/components/toast";
import { clearQuizHistory, fetchQuizHistory, insertQuizHistory } from "@/lib/db";
import { hasSupabase } from "@/lib/supabase";
import type { QuizHistoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  UNITS,
  getSentence,
  isVocabLoaded,
  loadVocab,
  wordsForUnit,
  wordsWithSentences,
  type QuizWord,
} from "@/lib/vocab";

type Mode = "blank" | "meaning";
type Difficulty = "normal" | "advanced";

type Question = {
  word: QuizWord;
  sentence: string | null;
  cloze: string | null;
};

type HistoryEntry = {
  word: string;
  m: string;
  sentence: string | null;
  guess: string;
  ok: boolean;
  timeLabel: string;
  mode: string;
  difficulty: Difficulty;
};

type Feedback = {
  ok: boolean;
};

const HISTORY_KEY = "g12vocab_history";

function maskWord(word: string) {
  const chars = [...word];
  let out = "";
  chars.forEach((c, i) => {
    if (/[a-zA-Z]/.test(c)) {
      out +=
        i === 0 || (i > 0 && !/[a-zA-Z]/.test(chars[i - 1])) ? c : "_";
    } else {
      out += c;
    }
  });
  return out;
}

function maskFull(word: string) {
  return [...word].map((c) => (/[a-zA-Z]/.test(c) ? "_" : c)).join("");
}

function maskSingle(word: string, firstChar: string) {
  return firstChar + "_".repeat(word.length - 1);
}

function escRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clozeSentence(sentence: string, word: string, noFirst: boolean) {
  const re = new RegExp("\\b" + escRe(word) + "\\b", "gi");
  return sentence.replace(re, (m) =>
    noFirst ? maskFull(word) : maskSingle(word, m[0]),
  );
}

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function poolFor(
  unit: number | "all",
  mode: Mode,
  difficulty: Difficulty,
): QuizWord[] {
  if (mode === "blank") {
    return wordsWithSentences(unit, difficulty === "advanced");
  }
  return wordsForUnit(unit);
}

function pickQuestion(
  unit: number | "all",
  mode: Mode,
  difficulty: Difficulty,
): Question | null {
  const pool = poolFor(unit, mode, difficulty);
  if (!pool.length) return null;
  const word = pool[Math.floor(Math.random() * pool.length)];
  const advanced = difficulty === "advanced";
  const sentence = mode === "blank" ? getSentence(word, advanced) : null;
  return {
    word,
    sentence,
    cloze: sentence ? clozeSentence(sentence, word.w, advanced) : null,
  };
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

function highlightWord(sentence: string, word: string): ReactNode[] {
  return sentence.split(new RegExp("(" + escRe(word) + ")", "gi")).map((p, i) =>
    p.toLowerCase() === word.toLowerCase() ? <b key={i}>{p}</b> : p,
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 4.5 21 12l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function EditIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function HelpIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SunIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function ZapIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function RefreshIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.023 9.348h4.992v-.001M2.985 19.645v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function CheckCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ListIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function FlameIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.048A8.287 8.287 0 0 0 9 9.6a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
    </svg>
  );
}

function MagnifierIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

export default function QuizPage() {
  const { user, profile, configured } = useAuth();
  const { success, error, info } = useToast();
  const [unit, setUnit] = useState<number | "all">("all");
  const [mode, setMode] = useState<Mode>("blank");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [question, setQuestion] = useState<Question | null>(null);
  const [solved, setSolved] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0 });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cloudHistory, setCloudHistory] = useState<QuizHistoryRow[]>([]);
  const [vocabReady, setVocabReady] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    let cancelled = false;
    loadVocab().then(() => {
      if (cancelled) return;
      setVocabReady(true);
      setQuestion(pickQuestion("all", "blank", "normal"));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!configured || !user) {
      setCloudHistory([]);
      return;
    }
    let cancelled = false;
    fetchQuizHistory(500, user.id).then((rows) => {
      if (!cancelled) setCloudHistory(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [configured, user]);

  function hydrate(next: Question | null) {
    setQuestion(next);
    setSolved(false);
    setAnswer("");
    setFeedback(null);
  }

  function changeUnit(next: number | "all") {
    setUnit(next);
    hydrate(pickQuestion(next, mode, difficulty));
  }

  function changeMode(next: Mode) {
    setMode(next);
    hydrate(pickQuestion(unit, next, difficulty));
  }

  function changeDifficulty(next: Difficulty) {
    setDifficulty(next);
    hydrate(pickQuestion(unit, mode, next));
  }

  function newQuiz() {
    setStats({ correct: 0, total: 0, streak: 0 });
    hydrate(pickQuestion(unit, mode, difficulty));
    info("New quiz started");
  }

  function addHistory(rec: HistoryEntry) {
    const next = [rec, ...history].slice(0, 500);
    setHistory(next);
    saveHistory(next);
  }

  function pushRemote(rec: HistoryEntry, word: QuizWord) {
    if (!configured || !user) return;
    insertQuizHistory({
      user_id: user.id,
      student_name: profile?.full_name || user.email || "Guest",
      unit_number: word.unit,
      word: word.w,
      meaning: word.m,
      guess: rec.guess,
      ok: rec.ok,
      mode: rec.mode,
      difficulty: rec.difficulty,
    })
      .then(() => fetchQuizHistory(500, user.id))
      .then(setCloudHistory)
      .catch(() => {});
  }

  function checkAnswer() {
    if (solved || !question) return;
    const guess = norm(answer);
    const ok = guess === norm(question.word.w);
    setStats((s) => ({
      correct: ok ? s.correct + 1 : s.correct,
      total: s.total + 1,
      streak: ok ? s.streak + 1 : 0,
    }));
    if (ok) {
      success("Correct!", question.word.w);
    } else {
      error("Not quite", `The answer was '${question.word.w}'`);
    }
    const rec: HistoryEntry = {
      word: question.word.w,
      m: question.word.m,
      sentence: question.sentence,
      guess: answer.trim() || "(no answer)",
      ok,
      timeLabel: new Date().toLocaleString(),
      mode: mode === "blank" ? "Blank" : "Meaning",
      difficulty,
    };
    addHistory(rec);
    pushRemote(rec, question.word);
    setFeedback({ ok });
    setSolved(true);
  }

  function onPrimary() {
    if (solved) hydrate(pickQuestion(unit, mode, difficulty));
    else checkAnswer();
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
    if (configured && user) {
      clearQuizHistory(user.id).then(() => setCloudHistory([])).catch(() => {});
    }
    info("History cleared");
  }

  const advanced = difficulty === "advanced";
  const clueLabel =
    mode === "blank"
      ? advanced
        ? "Fill in the blank · no hints"
        : "Fill in the blank"
      : advanced
        ? "Meaning · no first letter"
        : "Meaning";
  const mask = question
    ? advanced
      ? maskFull(question.word.w)
      : maskWord(question.word.w)
    : "";
  const unitTag = question
    ? question.word.title || "Unit " + question.word.unit
    : "";

  return (
    <Shell>
      <div className="space-y-4">
        {!configured && (
          <Card className="border-amber-200 bg-amber-50">
            <p className="text-sm font-semibold text-amber-700">
              Supabase is not configured
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Progress is saved locally only. Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY to enable cloud saving.
            </p>
          </Card>
        )}
        {configured && !user && (
          <Card className="border-indigo-200 bg-indigo-50">
            <div className="flex items-start gap-3">
              <p className="text-sm font-semibold text-indigo-700">
                Sign in to save your progress to the cloud
              </p>
              <Link href="/login" className="ml-auto">
                <Button variant="ghost" size="sm" className="text-sm">
                  Sign in
                </Button>
              </Link>
            </div>
          </Card>
        )}
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="unit"
                className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-gray-500"
              >
                Unit
              </label>
              <div className="relative">
                <select
                  id="unit"
                  value={unit}
                  onChange={(e) =>
                    changeUnit(
                      e.target.value === "all" ? "all" : Number(e.target.value),
                    )
                  }
                  className="w-full appearance-none border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="all">All Units</option>
                  {UNITS.map((u) => (
                    <option key={u.unit} value={u.unit}>
                      Unit {u.unit}: {u.title}
                    </option>
                  ))}
                </select>
                <MagnifierIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Mode
                </span>
                <div className="flex flex-col gap-1.5 sm:flex-row">
                  <Button
                    variant={mode === "blank" ? "primary" : "secondary"}
                    className="flex-1"
                    onClick={() => changeMode("blank")}
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Fill in the blank
                  </Button>
                  <Button
                    variant={mode === "meaning" ? "primary" : "secondary"}
                    className="flex-1"
                    onClick={() => changeMode("meaning")}
                  >
                    <HelpIcon className="h-3.5 w-3.5" />
                    Meaning clue
                  </Button>
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Difficulty
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant={!advanced ? "primary" : "secondary"}
                    className="flex-1"
                    onClick={() => changeDifficulty("normal")}
                  >
                    <SunIcon className="h-3.5 w-3.5" />
                    Normal
                  </Button>
                  <Button
                    variant={advanced ? "primary" : "secondary"}
                    className="flex-1"
                    onClick={() => changeDifficulty("advanced")}
                  >
                    <ZapIcon className="h-3.5 w-3.5" />
                    Advanced
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox
              label="Correct"
              value={stats.correct}
              accent="text-emerald-600"
              icon={<CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
            />
            <StatBox
              label="Answered"
              value={stats.total}
              accent="text-indigo-600"
              icon={<ListIcon className="h-4 w-4 text-indigo-500" />}
            />
            <StatBox
              label="Streak"
              value={stats.streak}
              accent={stats.streak > 0 ? "text-amber-600" : undefined}
              icon={<FlameIcon className="h-4 w-4 text-amber-500" />}
            />
          </div>
          <Button
            variant="secondary"
            className="mt-3 w-full"
            onClick={newQuiz}
          >
            <RefreshIcon className="h-4 w-4" />
            New Quiz
          </Button>
        </Card>

        <Card>
          {!vocabReady ? (
            <p className="py-4 text-sm text-gray-500">Loading vocabulary…</p>
          ) : question ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <Badge tone="indigo">{unitTag}</Badge>
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-gray-400">
                  {clueLabel}
                </span>
              </div>
              {vocabReady && isVocabLoaded() && (
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-gray-400">
                  Vocabulary synced from database
                </span>
              )}
              <div className="mt-4 space-y-3">
                {mode === "blank" && question.cloze ? (
                  <>
                    <p className="text-lg font-medium leading-7 text-gray-800 sm:text-xl">
                      {question.cloze}
                    </p>
                    <p className="text-xs font-semibold text-gray-400">
                      {question.word.w.length} letters
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium leading-7 text-gray-800 sm:text-xl">
                      {question.word.m}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 break-all text-lg font-bold tracking-[0.2em] text-indigo-600 sm:text-xl">
                        {mask}
                      </p>
                      <Badge tone="indigo" className="shrink-0">
                        {question.word.w.length} letters
                      </Badge>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onPrimary();
                    }
                  }}
                  disabled={solved}
                  placeholder="Type the English word..."
                  className="min-w-0 flex-1 border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <Button
                  size="lg"
                  onClick={onPrimary}
                  className="shrink-0"
                >
                  {solved ? (
                    <>
                      Next
                      <ArrowRightIcon className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Check
                      <CheckIcon className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-2 text-center text-xs text-gray-400 sm:text-left">
                Press Enter to{solved ? " go to the next word" : " check"}
              </p>
              {feedback && (
                <div
                  className={cn(
                    "mt-4 border p-4 text-sm leading-6",
                    feedback.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-900",
                  )}
                >
                  {feedback.ok ? <strong>Correct!</strong> : <strong>Wrong.</strong>}
                  {question.sentence ? (
                    <>
                      {" "}
                      {highlightWord(question.sentence, question.word.w)}
                      <br />
                      <span className="font-semibold">Meaning: </span>
                      {question.word.m}
                    </>
                  ) : feedback.ok ? (
                    <span> {question.word.w}</span>
                  ) : (
                    <>
                      <span> Correct answer: </span>
                      <b>{question.word.w}</b>
                      <br />
                      <span className="font-semibold">Meaning: </span>
                      {question.word.m}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No questions available"
              description="There are no words for this selection. Try a different unit or mode, or reset the quiz."
              action={
                <Button variant="ghost" onClick={newQuiz}>
                  <RefreshIcon className="h-3.5 w-3.5" />
                  Reset
                </Button>
              }
            />
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-base font-bold text-gray-900">History</h2>
            {history.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={clearHistory}
              >
                <TrashIcon className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
          {history.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {history.length} answered ·{" "}
              {history.filter((h) => h.ok).length} correct
            </p>
          )}
          <div className="mt-3 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">
                No questions answered yet.
              </p>
            ) : (
              history.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "border p-3",
                    h.ok
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-red-200 bg-red-50/60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{h.word}</span>
                    <Badge tone={h.ok ? "green" : "red"} className="ml-auto">
                      {h.ok ? "Correct" : "Wrong"}
                    </Badge>
                  </div>
                  {h.sentence && (
                    <p className="mt-1 text-sm text-gray-600">
                      <b>Clue: </b>
                      {h.sentence}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    <b>Meaning: </b>
                    {h.m}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-sm",
                      h.ok ? "text-emerald-700" : "text-red-700",
                    )}
                  >
                    You: {h.guess}
                    {!h.ok && (
                      <>
                        {" · Correct: "}
                        <b>{h.word}</b>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {h.timeLabel}
                    {h.difficulty ? ` · ${h.difficulty}` : ""}
                    {h.mode ? ` · ${h.mode}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
          {cloudHistory.length > 0 && (
            <>
              <h3 className="mt-5 border-t border-gray-100 pt-4 font-serif text-sm font-bold text-gray-900">
                Your saved history (cloud)
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {cloudHistory.length} saved ·{" "}
                {cloudHistory.filter((h) => h.ok).length} correct
              </p>
              <div className="mt-3 space-y-2">
                {cloudHistory.map((h) => (
                  <div
                    key={h.id}
                    className={cn(
                      "border p-3",
                      h.ok
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-red-200 bg-red-50/60",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{h.word}</span>
                      <Badge tone={h.ok ? "green" : "red"} className="ml-auto">
                        {h.ok ? "Correct" : "Wrong"}
                      </Badge>
                    </div>
                    {h.meaning && (
                      <p className="mt-1 text-sm text-gray-600">
                        <b>Meaning: </b>
                        {h.meaning}
                      </p>
                    )}
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        h.ok ? "text-emerald-700" : "text-red-700",
                      )}
                    >
                      You: {h.guess}
                      {!h.ok && (
                        <>
                          {" · Correct: "}
                          <b>{h.word}</b>
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(h.created_at).toLocaleString()}
                      {h.difficulty ? ` · ${h.difficulty}` : ""}
                      {h.mode ? ` · ${h.mode}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </Shell>
  );
}