import unitData from "@/data/vocab.json";
import sentenceData from "@/data/sentences.json";
import advancedSentenceData from "@/data/advanced-sentences.json";
import type { VocabUnit, SentenceBank, Word } from "@/lib/types";
import { fetchAllVocab } from "@/lib/db";

export let UNITS: VocabUnit[] = (unitData as { units: VocabUnit[] }).units;
export let SENTENCES: SentenceBank = sentenceData as SentenceBank;
export let ADVANCED_SENTENCES: SentenceBank = advancedSentenceData as SentenceBank;

let loadedUnits: VocabUnit[] = UNITS;
let loadedSentences: SentenceBank = SENTENCES;
let loadedAdvanced: SentenceBank = ADVANCED_SENTENCES;
let dbLoaded = false;

export type QuizWord = Word & { unit: number; title: string };

export async function loadVocab(): Promise<void> {
  try {
    const data = await fetchAllVocab();
    if (!data) return;
    loadedUnits = data.units.map((row) => ({
      unit: row.unit_number,
      title: row.title,
      words: data.words
        .filter((w) => w.unit_number === row.unit_number)
        .sort((a, b) => a.n - b.n)
        .map((w) => ({ n: w.n, w: w.word, m: w.meaning })),
    }));
    const normal: SentenceBank = {};
    const advanced: SentenceBank = {};
    for (const row of data.sentences) {
      normal[`${row.unit_number}.${row.n}`] = row.sentence;
      advanced[`${row.unit_number}.${row.n}`] = row.advanced;
    }
    loadedSentences = normal;
    loadedAdvanced = advanced;
    UNITS = loadedUnits;
    SENTENCES = loadedSentences;
    ADVANCED_SENTENCES = loadedAdvanced;
    dbLoaded = true;
  } catch {
    return;
  }
}

export function isVocabLoaded(): boolean {
  return dbLoaded;
}

export function allWords(): QuizWord[] {
  return loadedUnits.flatMap((u) =>
    u.words.map((w) => ({ ...w, unit: u.unit, title: u.title })),
  );
}

export function wordsForUnit(unit: number | "all"): QuizWord[] {
  if (unit === "all") return allWords();
  const u = loadedUnits.find((x) => x.unit === unit);
  return u ? u.words.map((w) => ({ ...w, unit: u.unit, title: "" })) : [];
}

export function wordsWithSentences(unit: number | "all", advanced: boolean): QuizWord[] {
  const bank = advanced ? loadedAdvanced : loadedSentences;
  return wordsForUnit(unit).filter((w) => bank[`${w.unit}.${w.n}`]);
}

export function getSentence(word: QuizWord, advanced: boolean): string | null {
  const bank = advanced ? loadedAdvanced : loadedSentences;
  return bank[`${word.unit}.${word.n}`] || null;
}

export function sentenceCount(unit: number | "all", advanced: boolean): number {
  return wordsWithSentences(unit, advanced).length;
}