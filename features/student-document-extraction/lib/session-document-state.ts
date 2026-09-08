import type { FileExtractionState } from "@/types/extraction";
import type { StudentDetailBaseline } from "@/types/student-detail";
import type { StudentRecord } from "@/types/student";

interface Params {
  currentFileKeys: string[];
  scopedRowsByFile: Record<string, number[]>;
  fileExtractions: Record<string, FileExtractionState>;
  sessionStudents: StudentRecord[];
  primarySessionStudent: StudentRecord | null;
  selectedStudentRow: number | null;
  filesLength: number;
  studentDetailBaseline: StudentDetailBaseline | null;
}

export function getSessionDocumentState({
  currentFileKeys,
  scopedRowsByFile,
  fileExtractions,
  sessionStudents,
  primarySessionStudent,
  selectedStudentRow,
  filesLength,
  studentDetailBaseline,
}: Params) {
  const primaryStudentFileKeys = primarySessionStudent
    ? currentFileKeys.filter((fileKey) => (scopedRowsByFile[fileKey] ?? []).includes(primarySessionStudent.rowIndex))
    : [];

  const primaryStudentExtractions = primaryStudentFileKeys
    .map((fileKey) => fileExtractions[fileKey])
    .filter(Boolean);

  const sessionKkExtraction = primaryStudentExtractions.find((item) => item.kk) ?? null;
  const sessionAktaExtraction = primaryStudentExtractions.find((item) => item.akta) ?? null;

  const unregisteredExtraction = sessionStudents.length > 0
    ? null
    : currentFileKeys
        .map((fileKey) => fileExtractions[fileKey])
        .filter(Boolean)
        .find((extraction) => extraction.kk || extraction.akta) ?? null;

  let activeStudentBaseline: StudentDetailBaseline | null = null;

  if (studentDetailBaseline) {
    const activeRowIndex = filesLength > 0
      ? primarySessionStudent?.rowIndex ?? null
      : selectedStudentRow;

    if (activeRowIndex !== null && studentDetailBaseline.rowIndex === activeRowIndex) {
      activeStudentBaseline = studentDetailBaseline;
    }
  }

  return {
    primaryStudentFileKeys,
    primaryStudentExtractions,
    sessionKkExtraction,
    sessionAktaExtraction,
    unregisteredExtraction,
    activeStudentBaseline,
  };
}