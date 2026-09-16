import { planDocumentRemoval } from "@/features/student/lib/document-removal-planner";

import type { FileExtractionState } from "@/types/extraction";

interface Params {
  studentRowIndex: number;
  currentFileKeys: string[];
  fileStudentScopes: Record<string, number[]>;
  rawRowsByFile: Record<string, number[]>;
  scopedRowsByFile: Record<string, number[]>;
  fileExtractions: Record<string, FileExtractionState>;
}

interface Result {
  nextScopes: Record<string, number[]>;
  removedFileKeys: string[];
}

export function planSavedStudentSessionCleanup({
  studentRowIndex,
  currentFileKeys,
  fileStudentScopes,
  rawRowsByFile,
  scopedRowsByFile,
  fileExtractions,
}: Params): Result {
  const nextScopes = { ...fileStudentScopes };

  const removedFileKeys = new Set<string>();

  currentFileKeys.forEach((fileKey) => {
    const scopedRows = scopedRowsByFile[fileKey] ?? [];

    if (!scopedRows.includes(studentRowIndex)) {
      return;
    }

    const removalPlan = planDocumentRemoval({
      hasKkExtraction: Boolean(fileExtractions[fileKey]?.kk),
      rawRows: rawRowsByFile[fileKey] ?? [],
      scopedRows,
      studentRowIndex,
    });

    if (removalPlan.mode === "virtual") {
      nextScopes[fileKey] = removalPlan.remainingRows;

      return;
    }

    delete nextScopes[fileKey];
    removedFileKeys.add(fileKey);
  });

  return { nextScopes, removedFileKeys: [...removedFileKeys] };
}
