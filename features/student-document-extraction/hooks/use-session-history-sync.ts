import { useEffect } from "react";

import { buildSessionHistoryItems } from "@/features/student-document-extraction/lib/session-history";

import type { FileExtractionState } from "@/types/extraction";
import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentRecord } from "@/types/student";
import type { StudentDetailBaseline } from "@/types/student-detail";

interface Params {
  sessionReady: boolean;
  sessionStudents: StudentRecord[];
  currentFileKeys: string[];
  scopedRowsByFile: Record<string, number[]>;
  fileExtractions: Record<string, FileExtractionState>;
  studentDetailBaseline: StudentDetailBaseline | null;
  history: ExtractionHistoryItem[];
  addOrUpdateHistory: (item: ExtractionHistoryItem) => void;
}

export function useSessionHistorySync({
  sessionReady,
  sessionStudents,
  currentFileKeys,
  scopedRowsByFile,
  fileExtractions,
  studentDetailBaseline,
  history,
  addOrUpdateHistory,
}: Params) {
  useEffect(() => {
    if (!sessionReady) return;

    const items = buildSessionHistoryItems({
      sessionStudents,
      currentFileKeys,
      scopedRowsByFile,
      fileExtractions,
      studentDetailBaseline,
      history,
      updatedAt: new Date().toISOString(),
    });

    items.forEach(addOrUpdateHistory);
  }, [
    sessionReady,
    sessionStudents,
    currentFileKeys,
    scopedRowsByFile,
    fileExtractions,
    studentDetailBaseline,
    history,
    addOrUpdateHistory,
  ]);
}
