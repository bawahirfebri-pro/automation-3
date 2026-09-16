import { useEffect } from "react";

import { clearStudentUrl, setStudentUrl } from "@/lib/students/student-url";

import type { StudentRecord } from "@/types/student";

interface Params {
  filesLength: number;
  primarySessionStudent: StudentRecord | null;
  isPreprocessing: boolean;
  isExtracting: boolean;
  hasPendingFiles: boolean;
}

export function useSessionUrlSync({
  filesLength,
  primarySessionStudent,
  isPreprocessing,
  isExtracting,
  hasPendingFiles,
}: Params) {
  useEffect(() => {
    if (filesLength === 0) return;
    if (primarySessionStudent) {
      setStudentUrl(primarySessionStudent.nik);
      return;
    }
    if (isPreprocessing || isExtracting || hasPendingFiles) return;
    clearStudentUrl();
  }, [filesLength, primarySessionStudent, isPreprocessing, isExtracting, hasPendingFiles]);
}
