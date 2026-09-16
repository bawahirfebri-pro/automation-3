import { extractStudentNameFromFilename } from "@/lib/documents/document-name";

import type { FileExtractionState } from "@/types/extraction";
import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentRecord } from "@/types/student";
import type { StudentDetailBaseline } from "@/types/student-detail";

interface Params {
  sessionStudents: StudentRecord[];
  currentFileKeys: string[];
  scopedRowsByFile: Record<string, number[]>;
  fileExtractions: Record<string, FileExtractionState>;
  studentDetailBaseline: StudentDetailBaseline | null;
  history: ExtractionHistoryItem[];
  updatedAt: string;
}

export function buildSessionHistoryItems({
  sessionStudents,
  currentFileKeys,
  scopedRowsByFile,
  fileExtractions,
  studentDetailBaseline,
  history,
  updatedAt,
}: Params): ExtractionHistoryItem[] {
  return sessionStudents.flatMap((student) => {
    const studentFileKeys = currentFileKeys.filter((fileKey) =>
      (scopedRowsByFile[fileKey] ?? []).includes(student.rowIndex),
    );

    const studentExtractions = studentFileKeys
      .map((fileKey) => fileExtractions[fileKey])
      .filter(Boolean);

    const kkExtraction = studentExtractions.find((item) => item.kk) ?? null;

    const aktaExtraction = studentExtractions.find((item) => item.akta) ?? null;

    const id = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);

    const existingHistory = history.find((item) => item.id === id) ?? null;

    const baseline =
      studentDetailBaseline?.rowIndex === student.rowIndex ? studentDetailBaseline : null;

    const kk = kkExtraction?.kk ?? baseline?.kk ?? existingHistory?.kk ?? null;

    const akta = aktaExtraction?.akta ?? baseline?.akta ?? existingHistory?.akta ?? null;

    if (!kk && !akta) {
      return [];
    }

    return [
      {
        id,
        studentName: student.nama,
        kk,
        akta,
        modelUsedKk: kk
          ? (kkExtraction?.modelUsedKk ??
            baseline?.modelUsedKk ??
            existingHistory?.modelUsedKk ??
            "")
          : "",
        modelUsedAkta: akta
          ? (aktaExtraction?.modelUsedAkta ??
            baseline?.modelUsedAkta ??
            existingHistory?.modelUsedAkta ??
            "")
          : "",
        updatedAt,
        savedAt: existingHistory?.savedAt ?? existingHistory?.savedToSheetAt,
      },
    ];
  });
}
