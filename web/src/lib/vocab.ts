import unitData from "@/data/vocab.json";
import sentenceData from "@/data/sentences.json";
import advancedSentenceData from "@/data/advanced-sentences.json";
import type { VocabUnit, SentenceBank, Word } from "@/lib/types";

export const UNITS: VocabUnit[] = (unitData as { units: VocabUnit[] }).units;
export const SENTENCES: SentenceBank = sentenceData as SentenceBank;
export const ADVANCED_SENTENCES: SentenceBank = advancedSentenceData as SentenceBank;

export type QuizWord = Word & { unit: number; title: string };

export function allWords(): QuizWord[] {
  return UNITS.flatMap((u) =>
    u.words.map((w) => ({ ...w, unit: u.unit, title: u.title })),
  );
}

export function wordsForUnit(unit: number | "all"): QuizWord[] {
  if (unit === "all") return allWords();
  const u = UNITS.find((x) => x.unit === unit);
  return u ? u.words.map((w) => ({ ...w, unit: u.unit, title: "" })) : [];
}

/** Only words that have a matching sentence available. */
export function wordsWithSentences(unit: number | "all", advanced: boolean): QuizWord[] {
  const bank = advanced ? ADVANCED_SENTENCES : SENTENCES;
  return wordsForUnit(unit).filter((w) => bank[`${w.unit}.${w.n}`]);
}

export function getSentence(word: QuizWord, advanced: boolean): string | null {
  const bank = advanced ? ADVANCED_SENTENCES : SENTENCES;
  return bank[`${word.unit}.${word.n}`] || null;
}

export function sentenceCount(unit: number | "all", advanced: boolean): number {
  return wordsWithSentences(unit, advanced).length;
}