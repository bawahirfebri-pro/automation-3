import type { StudentRecord } from "@/types/student";

export type StudentNameSource = "kk" | "akta" | "filename";

export interface StudentNameCandidate {
  name: string;
  normalizedName: string;
  source: StudentNameSource;
}

export interface StudentMatchResult {
  student: StudentRecord;
  candidate: StudentNameCandidate;
  score: number;
}

export interface FuzzyStudentCandidate {
  student: StudentRecord;
  candidate: StudentNameCandidate;
  score: number;
}

const AUTO_FUZZY_THRESHOLD = 0.92;
const AI_CANDIDATE_THRESHOLD = 0.55;
const MIN_AUTO_SCORE_GAP = 0.06;
const MIN_WORD_SIMILARITY = 0.78;

export function normalizeStudentName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function levenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0
    ? 1
    : 1 - levenshteinDistance(a, b) / maxLength;
}

function getWords(value: string): string[] {
  return normalizeStudentName(value).split(" ").filter(Boolean);
}

function wordSimilarity(a: string, b: string): number {
  const wordsA = getWords(a);
  const wordsB = getWords(b);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const used = new Set<number>();
  let total = 0;

  for (const wordA of wordsA) {
    let bestScore = 0;
    let bestIndex = -1;

    wordsB.forEach((wordB, index) => {
      if (used.has(index)) return;

      const score = levenshteinSimilarity(wordA, wordB);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0) {
      used.add(bestIndex);
      total += bestScore;
    }
  }

  return total / Math.max(wordsA.length, wordsB.length);
}

function tokenOverlapScore(a: string, b: string): number {
  const wordsA = new Set(getWords(a));
  const wordsB = new Set(getWords(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;

  wordsA.forEach((word) => {
    if (wordsB.has(word)) intersection += 1;
  });

  return intersection / Math.max(wordsA.size, wordsB.size);
}

function containmentScore(a: string, b: string): number {
  const normalizedA = normalizeStudentName(a);
  const normalizedB = normalizeStudentName(b);

  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;

  if (
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  ) {
    const shorter = Math.min(normalizedA.length, normalizedB.length);
    const longer = Math.max(normalizedA.length, normalizedB.length);

    return 0.78 + (shorter / longer) * 0.18;
  }

  return 0;
}

function hasStrongTokenRelation(a: string, b: string): boolean {
  const wordsA = getWords(a);
  const wordsB = getWords(b);

  if (wordsA.length === 0 || wordsB.length === 0) return false;

  /*
   * Minimal satu token panjang yang sama persis.
   *
   * JAUZA KAMILAH PRIYATNA
   * ↔ JAUZA KAMILAH
   * = lolos.
   */
  const exactImportantToken = wordsA.some(
    (wordA) =>
      wordA.length >= 4 &&
      wordsB.some((wordB) => wordA === wordB)
  );

  if (exactImportantToken) return true;

  /*
   * Atau ada token yang sangat mirip karena typo OCR.
   *
   * KAMILAH ↔ KAMILA
   */
  return wordsA.some((wordA) =>
    wordsB.some(
      (wordB) =>
        wordA.length >= 4 &&
        wordB.length >= 4 &&
        levenshteinSimilarity(wordA, wordB) >= MIN_WORD_SIMILARITY
    )
  );
}

export function calculateStudentNameSimilarity(
  a: string,
  b: string
): number {
  const normalizedA = normalizeStudentName(a);
  const normalizedB = normalizeStudentName(b);

  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;

  const characterScore = levenshteinSimilarity(normalizedA, normalizedB);
  const wordsScore = wordSimilarity(normalizedA, normalizedB);
  const overlapScore = tokenOverlapScore(normalizedA, normalizedB);
  const containsScore = containmentScore(normalizedA, normalizedB);

  const weightedScore =
    characterScore * 0.5 +
    wordsScore * 0.35 +
    overlapScore * 0.15;

  return Math.max(weightedScore, containsScore);
}

export function findExactStudentMatch(
  candidates: StudentNameCandidate[],
  students: StudentRecord[]
): StudentMatchResult | null {
  for (const candidate of candidates) {
    const normalizedCandidate =
      candidate.normalizedName || normalizeStudentName(candidate.name);

    if (!normalizedCandidate) continue;

    const matches = students.filter(
      (student) =>
        normalizeStudentName(student.nama) === normalizedCandidate
    );

    if (matches.length !== 1) continue;

    return {
      student: matches[0],
      candidate,
      score: 1,
    };
  }

  return null;
}

export function getFuzzyStudentCandidates(
  candidates: StudentNameCandidate[],
  students: StudentRecord[],
  limit = 5
): FuzzyStudentCandidate[] {
  const results: FuzzyStudentCandidate[] = [];

  for (const candidate of candidates) {
    for (const student of students) {
      const score = calculateStudentNameSimilarity(
        candidate.name,
        student.nama
      );

      /*
       * Dua pagar:
       * 1. score harus cukup dekat;
       * 2. harus ada token nama yang benar-benar berhubungan.
       */
      if (score < AI_CANDIDATE_THRESHOLD) continue;

      if (
        !hasStrongTokenRelation(
          candidate.name,
          student.nama
        )
      ) {
        continue;
      }

      results.push({
        student,
        candidate,
        score,
      });
    }
  }

  const unique = new Map<number, FuzzyStudentCandidate>();

  for (const result of results) {
    const previous = unique.get(result.student.rowIndex);

    if (!previous || result.score > previous.score) {
      unique.set(result.student.rowIndex, result);
    }
  }

  return [...unique.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
}

export function findFuzzyStudentMatch(
  candidates: StudentNameCandidate[],
  students: StudentRecord[]
): StudentMatchResult | null {
  const ranked = getFuzzyStudentCandidates(
    candidates,
    students,
    5
  );

  const best = ranked[0];

  if (!best || best.score < AUTO_FUZZY_THRESHOLD) {
    return null;
  }

  const second = ranked[1];

  if (
    second &&
    best.score - second.score < MIN_AUTO_SCORE_GAP
  ) {
    return null;
  }

  return {
    student: best.student,
    candidate: best.candidate,
    score: best.score,
  };
}