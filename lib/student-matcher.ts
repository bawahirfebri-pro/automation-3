import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { StudentRecord } from "@/types/student";

export type StudentNameSource = "akta" | "kk";

export interface StudentNameCandidate {
  name: string;
  normalizedName: string;
  source: StudentNameSource;
}

export interface ExactStudentMatch {
  student: StudentRecord;
  candidate: StudentNameCandidate;
}

export interface FuzzyStudentCandidate {
  student: StudentRecord;
  candidate: StudentNameCandidate;
  score: number;
}

export interface FuzzyStudentMatch {
  student: StudentRecord;
  candidate: StudentNameCandidate;
  score: number;
  secondScore: number;
}

const AUTO_MATCH_MIN_SCORE = 0.88;
const AUTO_MATCH_MIN_GAP = 0.08;

export function normalizeStudentName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }

  return previous[b.length];
}

function calculateNameSimilarity(a: string, b: string): number {
  const left = normalizeStudentName(a);
  const right = normalizeStudentName(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  const maxLength = Math.max(left.length, right.length);
  const distance = levenshteinDistance(left, right);
  let score = 1 - distance / maxLength;

  if (left.includes(right) || right.includes(left)) {
    score = Math.min(1, score + 0.04);
  }

  return Number(score.toFixed(4));
}

export function getStudentNameCandidates(
  kk: KkResult | null,
  akta: AktaResult | null
): StudentNameCandidate[] {
  const candidates: StudentNameCandidate[] = [];
  const seen = new Set<string>();

  const addCandidate = (
    name: string | null | undefined,
    source: StudentNameSource
  ) => {
    const normalizedName = normalizeStudentName(name || "");
    if (!normalizedName || seen.has(normalizedName)) return;

    seen.add(normalizedName);
    candidates.push({
      name: name?.trim() || "",
      normalizedName,
      source,
    });
  };

  if (akta?.nama_anak) addCandidate(akta.nama_anak, "akta");

  kk?.anggota_keluarga?.forEach((anggota) => {
    addCandidate(anggota.nama_lengkap, "kk");
  });

  return candidates;
}

export function findExactStudentMatch(
  candidates: StudentNameCandidate[],
  students: StudentRecord[]
): ExactStudentMatch | null {
  if (candidates.length === 0 || students.length === 0) return null;

  const studentMap = new Map<string, StudentRecord[]>();

  students.forEach((student) => {
    const key = normalizeStudentName(student.nama);
    if (!key) return;

    const existing = studentMap.get(key) || [];
    existing.push(student);
    studentMap.set(key, existing);
  });

  const matches = new Map<number, ExactStudentMatch>();

  candidates.forEach((candidate) => {
    const studentsWithName = studentMap.get(candidate.normalizedName);
    if (!studentsWithName || studentsWithName.length !== 1) return;

    const student = studentsWithName[0];

    matches.set(student.rowIndex, {
      student,
      candidate,
    });
  });

  const aktaMatches = [...matches.values()].filter(
    (match) => match.candidate.source === "akta"
  );

  if (aktaMatches.length === 1) return aktaMatches[0];
  if (matches.size === 1) return [...matches.values()][0];

  return null;
}

export function getFuzzyStudentCandidates(
  candidates: StudentNameCandidate[],
  students: StudentRecord[],
  limit = 5
): FuzzyStudentCandidate[] {
  if (candidates.length === 0 || students.length === 0) return [];

  const ranked: FuzzyStudentCandidate[] = [];

  for (const candidate of candidates) {
    for (const student of students) {
      const score = calculateNameSimilarity(
        candidate.normalizedName,
        student.nama
      );

      if (score <= 0) continue;

      ranked.push({
        student,
        candidate,
        score,
      });
    }
  }

  const bestPerStudent = new Map<number, FuzzyStudentCandidate>();

  ranked.forEach((item) => {
    const existing = bestPerStudent.get(item.student.rowIndex);

    if (!existing || item.score > existing.score) {
      bestPerStudent.set(item.student.rowIndex, item);
    }
  });

  return [...bestPerStudent.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findFuzzyStudentMatch(
  candidates: StudentNameCandidate[],
  students: StudentRecord[]
): FuzzyStudentMatch | null {
  const ranked = getFuzzyStudentCandidates(candidates, students, 2);

  if (ranked.length === 0) return null;

  const first = ranked[0];
  const second = ranked[1];
  const secondScore = second?.score ?? 0;

  if (first.score < AUTO_MATCH_MIN_SCORE) return null;
  if (first.score - secondScore < AUTO_MATCH_MIN_GAP) return null;

  return {
    student: first.student,
    candidate: first.candidate,
    score: first.score,
    secondScore,
  };
}