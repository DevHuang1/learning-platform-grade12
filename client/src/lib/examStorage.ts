// Editorial Study Hall: persistence is local-first, versioned, and defensive so a malformed draft never blocks the exam flow.
export type ExamDraft = { examId: string; stage: "active" | "review"; current: number; answers: Record<number, number>; flagged: number[]; secondsLeft: number; questionDurations: Record<number, number>; savedAt: string };
export type ExamAttempt = { id: string; examId: string; title: string; score: number; total: number; percentage: number; answers: Record<number, number>; completedAt: string; durationSeconds: number; questionDurations: Record<number, number> };

const DRAFT_KEY = "study-hall:exam-draft:v1";
const HISTORY_KEY = "study-hall:exam-history:v1";
const isBrowser = () => typeof window !== "undefined";
const parse = <T,>(value: string | null, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };

export const loadExamDraft = (examId: string): ExamDraft | null => { if (!isBrowser()) return null; const draft = parse<ExamDraft | null>(window.localStorage.getItem(DRAFT_KEY), null); return draft?.examId === examId ? draft : null; };
export const saveExamDraft = (draft: ExamDraft) => { if (isBrowser()) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); };
export const clearExamDraft = () => { if (isBrowser()) window.localStorage.removeItem(DRAFT_KEY); };
export const loadExamHistory = (): ExamAttempt[] => isBrowser() ? parse<ExamAttempt[]>(window.localStorage.getItem(HISTORY_KEY), []) : [];
export const saveExamAttempt = (attempt: ExamAttempt) => { if (!isBrowser()) return; const history = [attempt, ...loadExamHistory()].slice(0, 20); window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); };
