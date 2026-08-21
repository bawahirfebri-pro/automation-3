import type { FileExtractionState } from "@/hooks/use-document-extraction";
import type { StudentRecord } from "@/types/student";

import {
  findExactStudentMatch,
  findFuzzyStudentMatch,
  getFuzzyStudentCandidates,
  getStudentNameCandidates,
} from "@/lib/student-matcher";

export type FileStudentMatchSource =
  | "exact"
  | "fuzzy"
  | "ai"
  | "manual"
  | "filename"
  | "unmatched";

export interface FileStudentMatch {
  rowIndex: number | null;
  source: FileStudentMatchSource;
}

export interface PendingAiFileMatch {
  detectedNames: string[];
  candidates: {
    rowIndex: number;
    nama: string;
    score: number;
  }[];
}

export function matchFileStudentLocally(
  extraction: FileExtractionState,
  students: StudentRecord[]
): {
  match: FileStudentMatch;
  pendingAi: PendingAiFileMatch | null;
} {
  const candidates = getStudentNameCandidates(
    extraction.kk,
    extraction.akta
  );

  const exact = findExactStudentMatch(candidates, students);

  if (exact) {
    return {
      match: {
        rowIndex: exact.student.rowIndex,
        source: "exact",
      },
      pendingAi: null,
    };
  }

  const fuzzy = findFuzzyStudentMatch(candidates, students);

  if (fuzzy) {
    return {
      match: {
        rowIndex: fuzzy.student.rowIndex,
        source: "fuzzy",
      },
      pendingAi: null,
    };
  }

  const fuzzyCandidates = getFuzzyStudentCandidates(
    candidates,
    students,
    5
  );

  if (candidates.length === 0 || fuzzyCandidates.length === 0) {
    return {
      match: {
        rowIndex: null,
        source: "unmatched",
      },
      pendingAi: null,
    };
  }

  return {
    match: {
      rowIndex: null,
      source: "unmatched",
    },
    pendingAi: {
      detectedNames: candidates.map((candidate) => candidate.name),
      candidates: fuzzyCandidates.map(({ student, score }) => ({
        rowIndex: student.rowIndex,
        nama: student.nama,
        score,
      })),
    },
  };
}