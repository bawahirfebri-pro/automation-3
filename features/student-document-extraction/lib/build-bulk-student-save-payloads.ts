import { extractStudentNameFromFilename } from "@/lib/documents/document-name";

import { buildHistorySavePayload } from "@/features/student-document-extraction/lib/build-history-save-payload";
import { buildSessionSavePayload } from "@/features/student-document-extraction/lib/session-save-payload";

import type { StudentSaveData } from "@/features/student-document-extraction/types/student-save";

import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentRecord } from "@/types/student";

type SessionSaveParams = Parameters<typeof buildSessionSavePayload>[0];

interface Params {
  targetStudents: StudentRecord[];
  hasActiveFiles: boolean;
  sessionStudentRowIndexes: SessionSaveParams["sessionStudentRowIndexes"];
  currentFileKeys: SessionSaveParams["currentFileKeys"];
  scopedRowsByFile: SessionSaveParams["scopedRowsByFile"];
  fileExtractions: SessionSaveParams["fileExtractions"];
  historyMap: Map<string, ExtractionHistoryItem>;
}

export function buildBulkStudentSavePayloads({
  targetStudents,
  hasActiveFiles,
  sessionStudentRowIndexes,
  currentFileKeys,
  scopedRowsByFile,
  fileExtractions,
  historyMap,
}: Params): StudentSaveData[] {
  const sourceStudents = [
    ...new Map(
      (hasActiveFiles
        ? targetStudents.filter((student) => sessionStudentRowIndexes.includes(student.rowIndex))
        : targetStudents
      ).map((student) => [student.rowIndex, student]),
    ).values(),
  ];

  const rawPayloads = sourceStudents
    .map((student) => {
      if (hasActiveFiles) {
        return buildSessionSavePayload({
          student,
          sessionStudentRowIndexes,
          currentFileKeys,
          scopedRowsByFile,
          fileExtractions,
        });
      }

      const studentId = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);

      const historyItem = historyMap.get(studentId);

      if (!historyItem) {
        return null;
      }

      return buildHistorySavePayload({ student, historyItem, fileName: `${student.nama}_KK.pdf` });
    })
    .filter((payload): payload is StudentSaveData => payload !== null);

  return [...new Map(rawPayloads.map((payload) => [payload.rowIndex, payload])).values()];
}
