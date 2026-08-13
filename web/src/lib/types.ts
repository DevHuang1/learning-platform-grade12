export type Word = {
  n: number;
  w: string;
  m: string;
};

export type VocabUnit = {
  unit: number;
  title: string;
  words: Word[];
};

export type SentenceBank = Record<string, string>;

// ---- Supabase table types ----
export type VocabUnitRow = { id: number; unit_number: number; title: string };
export type VocabWordRow = {
  id: number;
  unit_number: number;
  n: number;
  word: string;
  meaning: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "teacher";
  created_at: string;
};

export type QuizHistoryRow = {
  id: number;
  user_id: string | null;
  student_name: string;
  unit_number: number | null;
  word: string;
  meaning: string | null;
  guess: string | null;
  ok: boolean;
  mode: string;
  difficulty: string;
  created_at: string;
};

export type ExamScheduleRow = {
  id: number;
  title: string;
  subject: string;
  announcement: string;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
};

export type ExamSheetRow = {
  id: number;
  title: string;
  subject: string;
  description: string;
  duration_minutes: number;
  status: "draft" | "published" | "closed";
  created_at: string;
};

export type ExamSectionRow = {
  id: number;
  sheet_id: number;
  position: number;
  title: string;
  instructions: string;
};

export type ExamQuestionRow = {
  id: number;
  section_id: number;
  position: number;
  prompt: string;
  answer_guide: string;
  marks: number;
  image_path: string | null;
  image_url: string | null;
};

export type ExamSubmissionRow = {
  id: number;
  sheet_id: number;
  user_id: string | null;
  student_name: string;
  status: "submitted" | "graded";
  obtained_marks: number;
  graded_by: string | null;
  created_at: string;
};

export type ExamAnswerRow = {
  id: number;
  submission_id: number;
  question_id: number;
  text_answer: string | null;
  image_path: string | null;
  image_url: string | null;
  marks_awarded: number | null;
  feedback: string | null;
  created_at: string;
};

// Composed exam with questions grouped by section, for the taker view.
export type ExamWithSections = ExamSheetRow & {
  sections: Array<
    ExamSectionRow & {
      questions: ExamQuestionRow[];
    }
  >;
  total_marks: number;
  question_count: number;
};