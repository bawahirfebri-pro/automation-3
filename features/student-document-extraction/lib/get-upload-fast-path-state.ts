import { getNamedStudentRow } from "@/lib/students/file-student-matcher";
import type { StudentRecord } from "@/types/student";

interface Params {
  selectedFiles: File[];
  students: StudentRecord[];
  currentFileKeys: string[];
  fileExtractions: Record<string, unknown>;
  fileResolutionComplete: Record<string, boolean>;
  aiMatchingFileKeys: string[];
}

export function getUploadFastPathState({
  selectedFiles,
  students,
  currentFileKeys,
  fileExtractions,
  fileResolutionComplete,
  aiMatchingFileKeys,
}: Params) {
  const namedRows =
    selectedFiles.map((file) =>
      getNamedStudentRow(
        file,
        students
      )
    );

  const existingReady =
    currentFileKeys.every(
      (fileKey) =>
        Boolean(
          fileExtractions[fileKey]
        ) &&
        Boolean(
          fileResolutionComplete[
            fileKey
          ]
        ) &&
        !aiMatchingFileKeys.includes(
          fileKey
        )
    );

  const resolvedRows =
    namedRows.filter(
      (
        rowIndex
      ): rowIndex is number =>
        rowIndex !== null
    );

  const canUseFilenameFastPath =
    existingReady &&
    resolvedRows.length ===
      namedRows.length;

  const incomingRows =
    canUseFilenameFastPath
      ? [...new Set(resolvedRows)]
      : [];

  return {
    canUseFilenameFastPath,
    incomingRows,
  };
}