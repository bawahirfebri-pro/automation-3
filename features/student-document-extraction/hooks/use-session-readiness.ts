import { useMemo } from "react";
import {
  getSessionReadiness,
  type SessionReadinessParams,
} from "@/features/student-document-extraction/lib/session-readiness";

export function useSessionReadiness({
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
  return useMemo(
    () =>
      getSessionReadiness({
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
      }),
    [
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
    ]
  );
}