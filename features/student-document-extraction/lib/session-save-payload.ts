import type { StudentSaveData } from "@/features/student-document-extraction/types/student-save";

import type { FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

interface Params {
  student: StudentRecord;
  sessionStudentRowIndexes: number[];
  currentFileKeys: string[];
  scopedRowsByFile: Record<string, number[]>;
  fileExtractions: Record<string, FileExtractionState>;
}

export function buildSessionSavePayload({
  student,
  sessionStudentRowIndexes,
  currentFileKeys,
  scopedRowsByFile,
  fileExtractions,
}: Params): StudentSaveData | null {
  if (!sessionStudentRowIndexes.includes(student.rowIndex)) {
    return null;
  }

  const studentFileKeys = currentFileKeys.filter((fileKey) =>
    (scopedRowsByFile[fileKey] ?? []).includes(student.rowIndex),
  );

  if (studentFileKeys.length === 0) {
    return null;
  }

  const studentExtractions = studentFileKeys
    .map((fileKey) => ({ fileKey, extraction: fileExtractions[fileKey] }))
    .filter((item): item is { fileKey: string; extraction: FileExtractionState } =>
      Boolean(item.extraction),
    );

  const kkItem = studentExtractions.find(({ extraction }) => Boolean(extraction.kk)) ?? null;

  const aktaItem = studentExtractions.find(({ extraction }) => Boolean(extraction.akta)) ?? null;

  const extractedData = !student.kkComplete ? (kkItem?.extraction.kk ?? null) : null;

  const aktaData = !student.aktaComplete ? (aktaItem?.extraction.akta ?? null) : null;

  if (!extractedData && !aktaData) {
    return null;
  }

  return {
    rowIndex: student.rowIndex,
    extractedData,
    aktaData,
    fileName: `${student.nama}_KK.pdf`,
  };
}
