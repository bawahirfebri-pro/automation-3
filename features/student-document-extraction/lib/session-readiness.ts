import type { FileStudentMatch } from "@/lib/students/file-student-matcher";

import type { FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

export interface SessionReadinessParams {
  filesLength: number;
  currentFileKeys: string[];
  scopedRowsByFile: Record<string, number[]>;
  fileExtractions: Record<string, FileExtractionState>;
  fileStudentMatches: Record<string, FileStudentMatch>;
  fileResolutionComplete: Record<string, boolean>;
  failedFileKeys: string[];
  students: StudentRecord[];
  pendingUploadFileKeys: string[];
  isExtracting: boolean;
  isAiMatching: boolean;
}

export function getSessionReadiness({
  filesLength,
  currentFileKeys,
  scopedRowsByFile,
  fileExtractions,
  fileStudentMatches,
  fileResolutionComplete,
  failedFileKeys,
  students,
  pendingUploadFileKeys,
  isExtracting,
  isAiMatching,
}: SessionReadinessParams) {
  const currentKkFileKeys = currentFileKeys.filter((fileKey) =>
    Boolean(fileExtractions[fileKey]?.kk),
  );
  const currentAktaFileKeys = currentFileKeys.filter((fileKey) =>
    Boolean(fileExtractions[fileKey]?.akta),
  );
  const sessionStudentRowIndexes = [
    ...new Set(currentFileKeys.flatMap((fileKey) => scopedRowsByFile[fileKey] ?? [])),
  ];
  const kkStudentRowIndexes = [
    ...new Set(currentKkFileKeys.flatMap((fileKey) => scopedRowsByFile[fileKey] ?? [])),
  ];

  const sessionStudents = sessionStudentRowIndexes
    .map((rowIndex) => students.find((student) => student.rowIndex === rowIndex))
    .filter((student): student is StudentRecord => Boolean(student));

  let sessionConflict = "";

  if (filesLength > 0 && !isExtracting && !isAiMatching) {
    if (currentKkFileKeys.length > 0) {
      if (kkStudentRowIndexes.length > 0) {
        const kkRows = new Set(kkStudentRowIndexes);
        const foreignAktaRows = [
          ...new Set(
            currentAktaFileKeys.flatMap((fileKey) =>
              (scopedRowsByFile[fileKey] ?? []).filter((rowIndex) => !kkRows.has(rowIndex)),
            ),
          ),
        ];

        if (foreignAktaRows.length > 0) {
          const names = foreignAktaRows
            .map((rowIndex) => students.find((student) => student.rowIndex === rowIndex)?.nama)
            .filter((name): name is string => Boolean(name));

          sessionConflict =
            names.length > 0
              ? `Akta terdeteksi milik siswa di luar Kartu Keluarga: ${names.join(", ")}.`
              : "Terdapat Akta yang tidak sesuai dengan siswa pada Kartu Keluarga.";
        }
      }
    } else if (sessionStudentRowIndexes.length > 1) {
      sessionConflict = `Dokumen terdeteksi milik siswa berbeda: ${sessionStudents.map((student) => student.nama).join(", ")}.`;
    }
  }

  const failedFileKeySet = new Set(failedFileKeys);
  const missingExtractionFileKeys = currentFileKeys.filter(
    (fileKey) => !fileExtractions[fileKey] && !failedFileKeySet.has(fileKey),
  );

  const unresolvedFileKeys = currentFileKeys.filter(
    (fileKey) =>
      Boolean(fileExtractions[fileKey]) &&
      (fileStudentMatches[fileKey]?.rowIndexes.length ?? 0) === 0,
  );

  const duplicates: string[] = [];

  for (const student of sessionStudents) {
    const kkCount = currentKkFileKeys.filter((fileKey) =>
      (scopedRowsByFile[fileKey] ?? []).includes(student.rowIndex),
    ).length;

    const aktaCount = currentAktaFileKeys.filter((fileKey) =>
      (scopedRowsByFile[fileKey] ?? []).includes(student.rowIndex),
    ).length;

    if (kkCount <= 1 && aktaCount <= 1) continue;

    const types: string[] = [];
    if (kkCount > 1) types.push("KK");
    if (aktaCount > 1) types.push("Akta Kelahiran");

    duplicates.push(`${student.nama} (${types.join(" dan ")})`);
  }

  const duplicateDocumentMsg =
    duplicates.length === 0
      ? ""
      : `Terdapat dokumen duplikat untuk ${duplicates.join(", ")}. Hapus dokumen duplikat sebelum menyimpan data.`;

  const unresolvedResolutionFileKeys = currentFileKeys.filter(
    (fileKey) => !fileResolutionComplete[fileKey],
  );

  const sessionReady =
    filesLength > 0 &&
    pendingUploadFileKeys.length === 0 &&
    !isExtracting &&
    !isAiMatching &&
    !sessionConflict &&
    !duplicateDocumentMsg &&
    missingExtractionFileKeys.length === 0 &&
    unresolvedFileKeys.length === 0 &&
    unresolvedResolutionFileKeys.length === 0 &&
    sessionStudents.length > 0;

  return {
    currentKkFileKeys,
    currentAktaFileKeys,
    sessionStudentRowIndexes,
    kkStudentRowIndexes,
    sessionStudents,
    sessionConflict,
    duplicateDocumentMsg,
    missingExtractionFileKeys,
    unresolvedFileKeys,
    unresolvedResolutionFileKeys,
    sessionReady,
  };
}
