import { toNameCase } from "@/lib/documents/document-helpers";
import { normalizeStudentName } from "@/lib/students/student-matcher";

import type { FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

export interface FilenameMatchIssue {
  status: "not-found";
  detectedName: string;
}

interface Params {
  currentFileKeys: string[];
  processedFileKeys: string[];
  fileExtractions: Record<string, FileExtractionState>;
  students: StudentRecord[];
}

export function getFilenameMatchIssues({
  currentFileKeys,
  processedFileKeys,
  fileExtractions,
  students,
}: Params): Record<string, FilenameMatchIssue> {
  const processedSet = new Set(processedFileKeys);
  const issues: Record<string, FilenameMatchIssue> = {};

  currentFileKeys.forEach((fileKey) => {
    if (!processedSet.has(fileKey)) {
      return;
    }

    const extraction = fileExtractions[fileKey];

    if (!extraction) {
      return;
    }

    const detectedName = extraction.akta?.nama_anak?.trim() ?? "";

    if (!detectedName) {
      return;
    }

    const normalizedDetectedName = normalizeStudentName(detectedName);

    const exactStudents = students.filter(
      (student) => normalizeStudentName(student.nama) === normalizedDetectedName,
    );

    const prefixStudents =
      exactStudents.length === 0
        ? students.filter((student) =>
            normalizeStudentName(student.nama).startsWith(`${normalizedDetectedName} `),
          )
        : [];

    const registered = exactStudents.length === 1 || prefixStudents.length === 1;

    if (registered) {
      return;
    }

    issues[fileKey] = { status: "not-found", detectedName: toNameCase(detectedName) };
  });

  return issues;
}
