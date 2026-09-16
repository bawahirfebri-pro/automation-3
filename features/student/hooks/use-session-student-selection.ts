import { useEffect } from "react";

import type { StudentRecord } from "@/types/student";

interface Params {
  filesLength: number;
  sessionStudents: StudentRecord[];
  selectedStudentRow: number | null;
  setSelectedStudentRow: (rowIndex: number | null) => void;
}

export function useSessionStudentSelection({
  filesLength,
  sessionStudents,
  selectedStudentRow,
  setSelectedStudentRow,
}: Params) {
  useEffect(() => {
    if (filesLength === 0 || sessionStudents.length === 0) return;
    const selectedStillValid =
      selectedStudentRow !== null &&
      sessionStudents.some((student) => student.rowIndex === selectedStudentRow);
    if (!selectedStillValid) setSelectedStudentRow(sessionStudents[0].rowIndex);
  }, [filesLength, sessionStudents, selectedStudentRow, setSelectedStudentRow]);
}
