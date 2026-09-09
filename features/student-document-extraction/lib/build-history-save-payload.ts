import type { StudentSaveData } from "@/features/student-document-extraction/types/student-save";

import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentRecord } from "@/types/student";

interface Params {
  student: StudentRecord;
  historyItem: ExtractionHistoryItem;
  fileName: string;
}

export function buildHistorySavePayload({
  student,
  historyItem,
  fileName,
}: Params): StudentSaveData | null {
  const extractedData = !student.kkComplete && historyItem.kk ? historyItem.kk : null;

  const aktaData = !student.aktaComplete && historyItem.akta ? historyItem.akta : null;

  if (!extractedData && !aktaData) {
    return null;
  }

  return { rowIndex: student.rowIndex, extractedData, aktaData, fileName };
}
