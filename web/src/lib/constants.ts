export const SUBJECTS = ["Chemistry", "English", "Physics", "Maths"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const QUESTION_TYPES = [
  "multiple_choice",
  "short_answer",
  "fill_blank",
  "true_false",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  short_answer: "Short answer",
  fill_blank: "Fill in the blank",
  true_false: "True or false",
};