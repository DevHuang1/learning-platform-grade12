import { hasSupabase, supabase } from "./supabase";
import type {
  ExamAnswerRow,
  ExamQuestionRow,
  ExamScheduleRow,
  ExamSectionRow,
  ExamSheetRow,
  ExamSubmissionRow,
  ExamWithSections,
  ProfileRow,
  QuizHistoryRow,
  VocabSentenceRow,
  VocabUnitRow,
  VocabWordRow,
} from "./types";

// ---- Profiles ----
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!hasSupabase()) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return (data as ProfileRow) || null;
}

export async function updateProfile(
  userId: string,
  patch: Partial<ProfileRow>,
) {
  if (!hasSupabase()) return;
  await supabase.from("profiles").update(patch).eq("id", userId);
}

export async function fetchAllStudents(): Promise<ProfileRow[]> {
  if (!hasSupabase()) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("full_name");
  return (data as ProfileRow[]) || [];
}

export async function updateStudentRole(
  id: string,
  role: "student" | "teacher",
) {
  if (!hasSupabase()) return;
  await supabase.from("profiles").update({ role }).eq("id", id);
}

/** All quiz history grouped per user — used by teachers for the students page. */
export async function fetchAllQuizHistory(
  limit = 5000,
): Promise<QuizHistoryRow[]> {
  if (!hasSupabase()) return [];
  const { data } = await supabase
    .from("quiz_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as QuizHistoryRow[]) || [];
}

/** Fetch submissions for specific user ids (for per-student exam stats). */
export async function fetchSubmissionsForUsers(
  userIds: string[],
): Promise<ExamSubmissionRow[]> {
  if (!hasSupabase() || !userIds.length) return [];
  const { data } = await supabase
    .from("exam_submissions")
    .select("*")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });
  return (data as ExamSubmissionRow[]) || [];
}

export async function fetchVocabUnits(): Promise<VocabUnitRow[]> {
  if (!hasSupabase()) return [];
  const { data } = await supabase
    .from("vocab_units")
    .select("*")
    .order("unit_number");
  return data || [];
}

export async function fetchVocabWords(
  unitNumber?: number,
): Promise<VocabWordRow[]> {
  if (!hasSupabase()) return [];
  let q = supabase.from("vocab_words").select("*").order("n");
  if (unitNumber) q = q.eq("unit_number", unitNumber);
  const { data } = await q;
  return data || [];
}

export async function fetchVocabSentences(): Promise<VocabSentenceRow[]> {
  if (!hasSupabase()) return [];
  const { data } = await supabase
    .from("vocab_sentences")
    .select("*")
    .order("unit_number")
    .order("n");
  return data || [];
}

export async function fetchAllVocab(): Promise<{
  units: VocabUnitRow[];
  words: VocabWordRow[];
  sentences: VocabSentenceRow[];
} | null> {
  if (!hasSupabase()) return null;
  try {
    const [units, words, sentences] = await Promise.all([
      fetchVocabUnits(),
      fetchVocabWords(),
      fetchVocabSentences(),
    ]);
    return { units, words, sentences };
  } catch {
    return null;
  }
}

export async function fetchSchedules(
  activeOnly = true,
): Promise<ExamScheduleRow[]> {
  if (!hasSupabase()) return [];
  let q = supabase
    .from("exam_schedules")
    .select("*")
    .order("exam_date", { ascending: true });
  if (activeOnly) q = q.eq("is_active", true);
  const { data } = await q;
  return data || [];
}

export async function insertSchedule(s: {
  title: string;
  subject: string;
  announcement: string;
  exam_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
}): Promise<ExamScheduleRow | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from("exam_schedules")
    .insert({ ...s, is_active: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSchedule(
  id: number,
  patch: Partial<ExamScheduleRow>,
) {
  if (!hasSupabase()) return;
  await supabase.from("exam_schedules").update(patch).eq("id", id);
}

export async function deleteSchedule(id: number) {
  if (!hasSupabase()) return;
  await supabase.from("exam_schedules").delete().eq("id", id);
}

// ---- Exam sheets ----
export async function fetchExamSheets(
  status?: string,
): Promise<ExamSheetRow[]> {
  if (!hasSupabase()) return [];
  let q = supabase
    .from("exam_sheets")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return data || [];
}

export async function fetchExamSheet(
  id: number,
): Promise<ExamWithSections | null> {
  if (!hasSupabase()) return null;
  const { data: sheet } = await supabase
    .from("exam_sheets")
    .select("*")
    .eq("id", id)
    .single();
  if (!sheet) return null;

  const { data: sections } = await supabase
    .from("exam_sheet_sections")
    .select("*")
    .eq("sheet_id", id)
    .order("position");
  const sectionsArr = sections || [];

  const sectionIds = sectionsArr.map((s) => s.id);
  let questions: ExamQuestionRow[] = [];
  if (sectionIds.length) {
    const { data: qs } = await supabase
      .from("exam_questions")
      .select("*")
      .in("section_id", sectionIds)
      .order("position");
    questions = qs || [];
  }

  const withSections: Array<ExamSectionRow & { questions: ExamQuestionRow[] }> =
    sectionsArr.map((s) => ({
      ...s,
      questions: questions.filter((q) => q.section_id === s.id),
    }));

  return {
    ...sheet,
    sections: withSections,
    total_marks: withSections.reduce(
      (acc: number, s) =>
        acc + s.questions.reduce((a: number, q) => a + q.marks, 0),
      0,
    ),
    question_count: questions.length,
  } as ExamWithSections;
}

export async function insertExamSheet(sheet: {
  title: string;
  subject: string;
  description: string;
  duration_minutes: number;
  status?: string;
}): Promise<ExamSheetRow | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from("exam_sheets")
    .insert(sheet)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateExamSheet(
  id: number,
  patch: Partial<ExamSheetRow>,
) {
  if (!hasSupabase()) return;
  await supabase.from("exam_sheets").update(patch).eq("id", id);
}

export async function deleteExamSheet(id: number) {
  if (!hasSupabase()) return;
  await supabase.from("exam_sheets").delete().eq("id", id);
}

// ---- Sections & questions ----
export async function insertSection(
  sheetId: number,
  title: string,
  position: number,
  instructions = "",
  image?: { image_path?: string | null; image_url?: string | null },
) {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from("exam_sheet_sections")
    .insert({
      sheet_id: sheetId,
      title,
      position,
      instructions,
      image_path: image?.image_path ?? null,
      image_url: image?.image_url ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ExamSectionRow | null;
}

export async function insertQuestion(
  sectionId: number,
  q: {
    position: number;
    prompt: string;
    answer_guide?: string;
    marks: number;
    image_path?: string | null;
    image_url?: string | null;
    question_type?:
      | "multiple_choice"
      | "short_answer"
      | "fill_blank"
      | "true_false";
    options?: string[];
    correct_option?: number;
  },
) {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from("exam_questions")
    .insert({ section_id: sectionId, ...q })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ExamQuestionRow | null;
}

export async function deleteSection(id: number) {
  if (!hasSupabase()) return;
  await supabase.from("exam_sheet_sections").delete().eq("id", id);
}

export async function deleteQuestion(id: number) {
  if (!hasSupabase()) return;
  await supabase.from("exam_questions").delete().eq("id", id);
}

// ---- Submissions & answers ----
export async function insertSubmission(s: {
  sheet_id: number;
  student_name: string;
  user_id?: string | null;
}): Promise<ExamSubmissionRow | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from("exam_submissions")
    .insert({
      ...s,
      user_id: s.user_id || null,
      status: "submitted",
      obtained_marks: 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function insertAnswer(a: {
  submission_id: number;
  question_id: number;
  text_answer?: string | null;
  image_path?: string | null;
  image_url?: string | null;
}): Promise<ExamAnswerRow | null> {
  if (!hasSupabase()) return null;
  const { data, error } = await supabase
    .from("exam_answers")
    .insert(a)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchSubmissions(
  sheetId?: number,
): Promise<ExamSubmissionRow[]> {
  if (!hasSupabase()) return [];
  let q = supabase
    .from("exam_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (sheetId) q = q.eq("sheet_id", sheetId);
  const { data } = await q;
  return (data as ExamSubmissionRow[]) || [];
}

export async function fetchMySubmissions(
  userId: string,
  sheetId?: number,
): Promise<ExamSubmissionRow[]> {
  if (!hasSupabase()) return [];
  let q = supabase
    .from("exam_submissions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (sheetId) q = q.eq("sheet_id", sheetId);
  const { data } = await q;
  return (data as ExamSubmissionRow[]) || [];
}

export async function fetchAnswersForSubmission(
  submissionId: number,
): Promise<ExamAnswerRow[]> {
  if (!hasSupabase()) return [];
  const { data } = await supabase
    .from("exam_answers")
    .select("*")
    .eq("submission_id", submissionId);
  return data || [];
}

export async function gradeSubmission(
  submissionId: number,
  answers: Array<{ id: number; marks_awarded: number; feedback?: string }>,
  gradedBy: string,
) {
  if (!hasSupabase()) return;
  for (const a of answers) {
    await supabase
      .from("exam_answers")
      .update({ marks_awarded: a.marks_awarded, feedback: a.feedback || null })
      .eq("id", a.id);
  }
  const { data: full } = await supabase
    .from("exam_answers")
    .select("marks_awarded")
    .eq("submission_id", submissionId);
  const obtained = (full || []).reduce(
    (acc, a) => acc + (a.marks_awarded || 0),
    0,
  );
  await supabase
    .from("exam_submissions")
    .update({ status: "graded", obtained_marks: obtained, graded_by: gradedBy })
    .eq("id", submissionId);
  return obtained;
}

// ---- Quiz history ----
export async function insertQuizHistory(h: {
  user_id?: string | null;
  student_name: string;
  unit_number?: number | null;
  word: string;
  meaning?: string | null;
  guess?: string | null;
  ok: boolean;
  mode: string;
  difficulty: string;
}) {
  if (!hasSupabase()) return;
  await supabase
    .from("quiz_history")
    .insert({ ...h, user_id: h.user_id || null });
}

export async function fetchQuizHistory(
  limit = 200,
  userId?: string,
): Promise<QuizHistoryRow[]> {
  if (!hasSupabase()) return [];
  let q = supabase
    .from("quiz_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q;
  return (data as QuizHistoryRow[]) || [];
}

export async function clearQuizHistory(userId: string) {
  if (!hasSupabase()) return;
  await supabase.from("quiz_history").delete().eq("user_id", userId);
}
