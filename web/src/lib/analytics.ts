import type { ExamSubmissionRow, QuizHistoryRow } from "./types";

export type DailyAccuracy = { date: string; total: number; correct: number; pct: number };
export type UnitProgress = { unit: number; title: string; total: number; correct: number; pct: number };
export type DateTimeBucket = { label: string; value: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** Build an accuracy series for the last N days (fills gaps with zeros). */
export function accuracySeries(history: QuizHistoryRow[], days = 14): DailyAccuracy[] {
  const out: DailyAccuracy[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = dayKey(d);
    const rows = history.filter((h) => dayKey(new Date(h.created_at)) === key);
    const correct = rows.filter((h) => h.ok).length;
    out.push({
      date: key,
      total: rows.length,
      correct,
      pct: rows.length ? Math.round((correct / rows.length) * 100) : 0,
    });
  }
  return out;
}

/** Activity by mode (Blank vs Meaning) and by difficulty. */
export function modeBreakdown(history: QuizHistoryRow[]) {
  const blank = history.filter((h) => h.mode === "Blank").length;
  return { blank, meaning: history.length - blank };
}

export function difficultyBreakdown(history: QuizHistoryRow[]) {
  const normal = history.filter((h) => h.difficulty === "normal").length;
  const advanced = history.filter((h) => h.difficulty === "advanced").length;
  return { normal, advanced };
}

/** Per-unit mastery from quiz history (requires unit_number present). */
export function unitProgress(
  history: QuizHistoryRow[],
  unitTitles?: Map<number, string>,
): UnitProgress[] {
  const map = new Map<number, { total: number; correct: number }>();
  const titles = new Map<number, string>(unitTitles);
  for (const h of history) {
    if (!h.unit_number) continue;
    const e = map.get(h.unit_number) || { total: 0, correct: 0 };
    e.total++;
    if (h.ok) e.correct++;
    map.set(h.unit_number, e);
  }
  return [...map.entries()]
    .map(([unit, v]) => ({
      unit,
      title: titles.get(unit) || `Unit ${unit}`,
      total: v.total,
      correct: v.correct,
      pct: Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);
}

/** Compute headline KPI metrics. */
export function computeMetrics(history: QuizHistoryRow[]) {
  const total = history.length;
  const correct = history.filter((h) => h.ok).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  let streak = 0;
  for (const h of history) {
    if (h.ok) streak++;
    else break;
  }
  const today = dayKey(new Date());
  const todayTotal = history.filter((h) => dayKey(new Date(h.created_at)) === today).length;
  return { total, correct, accuracy, streak, todayTotal, wrong: total - correct };
}

/** Submission score summary (from newest history order, already desc). */
export function submissionScore(sub: ExamSubmissionRow, totalMarks: number) {
  const pct = totalMarks ? Math.round(((sub.obtained_marks || 0) / totalMarks) * 100) : 0;
  return { obtained: sub.obtained_marks || 0, total: totalMarks, pct };
}

/** Bucket history into a simple activity histogram over hours (0-23). */
export function hourActivity(history: QuizHistoryRow[]): DateTimeBucket[] {
  const hours = new Array(24).fill(0);
  for (const h of history) {
    const hr = new Date(h.created_at).getHours();
    hours[hr]++;
  }
  return hours.map((value, i) => ({ label: String(i).padStart(2, "0"), value }));
}

export { shortLabel, dayKey };