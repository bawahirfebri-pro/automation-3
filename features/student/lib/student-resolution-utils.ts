import { createFileStudentMatch, type FileStudentMatch } from "@/lib/students/file-student-matcher";

import type { StudentRecord } from "@/types/student";

interface CandidateLike {
  rowIndex: number;
}

interface ApplyAiResolvedStudentMatchParams {
  previous: Record<string, FileStudentMatch>;
  fileKey: string;
  baseRows: number[];
  rowIndex: number;
}

export function isResolutionRowValid(
  rowIndex: number,
  candidates: readonly CandidateLike[],
  students: readonly StudentRecord[],
): boolean {
  const isCandidate = candidates.some((candidate) => candidate.rowIndex === rowIndex);

  if (!isCandidate) {
    return false;
  }

  return students.some((student) => student.rowIndex === rowIndex);
}

export function applyAiResolvedStudentMatch({
  previous,
  fileKey,
  baseRows,
  rowIndex,
}: ApplyAiResolvedStudentMatchParams): {
  next: Record<string, FileStudentMatch>;
  collision: boolean;
} {
  const previousMatch = previous[fileKey];
  const previousRows = previousMatch?.rowIndexes ?? [];

  if (previousRows.includes(rowIndex)) {
    return { next: previous, collision: true };
  }

  const source = previousMatch?.source === "manual" ? "manual" : "ai";

  return {
    next: {
      ...previous,
      [fileKey]: createFileStudentMatch([...baseRows, ...previousRows, rowIndex], source),
    },
    collision: false,
  };
}
