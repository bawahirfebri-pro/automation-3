import type { FileStudentMatch } from "@/lib/students/file-student-matcher";

interface Params {
  currentFileKeys: string[];
  fileStudentMatches: Record<string, FileStudentMatch>;
  fileStudentScopes: Record<string, number[]>;
}

export function getStudentFileMembership({
  currentFileKeys,
  fileStudentMatches,
  fileStudentScopes,
}: Params) {
  const rawRowsByFile = Object.fromEntries(
    currentFileKeys.map((fileKey) => [
      fileKey,
      fileStudentMatches[fileKey]?.rowIndexes ?? [],
    ])
  ) as Record<string, number[]>;

  const scopedRowsByFile = Object.fromEntries(
    currentFileKeys.map((fileKey) => {
      const scopedRows = fileStudentScopes[fileKey];

      return [
        fileKey,
        scopedRows?.length
          ? scopedRows
          : rawRowsByFile[fileKey] ?? [],
      ];
    })
  ) as Record<string, number[]>;

  return {
    rawRowsByFile,
    scopedRowsByFile,
  };
}