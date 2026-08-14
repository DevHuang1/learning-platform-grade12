import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check if a student's answer matches the expected answer (case-insensitive, ignore whitespace)
export function checkAnswer(
  question: { answer_guide: string; prompt: string },
  studentAnswer: string,
): boolean {
  const expected = question.answer_guide?.trim().toLowerCase() || "";
  const answer = studentAnswer.toLowerCase().trim();

  // Exact match
  if (expected === answer) {
    return true;
  }

  // Check if student answer is contained within the answer guide (for partial matches)
  if (answer.includes(expected) || expected.includes(answer)) {
    return true;
  }

  return false;
}
