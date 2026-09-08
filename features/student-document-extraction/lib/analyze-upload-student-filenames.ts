import { getDocumentFileKey } from "@/lib/documents/document-file-key";
import { getNamedStudentRow } from "@/lib/students/file-student-matcher";
import type { StudentRecord } from "@/types/student";

interface ImmediateNamedMatch {
  file: File;
  fileKey: string;
  rowIndex: number;
}

interface FilenameMatchIssue {
  status: "not-found";
  detectedName: string;
}

export function analyzeUploadStudentFilenames(
  selectedFiles: File[],
  students: StudentRecord[]
) {
  const selectedKeys =
    selectedFiles.map(getDocumentFileKey);

  const filenameIssueEntries =
    selectedFiles.flatMap((file) => {
      const fileKey =
        getDocumentFileKey(file);

      const match =
        file.name.match(
          /^(.*?)[\s_-]+(?:kk|kartu[\s_-]*keluarga|akta(?:[\s_-]*kelahiran)?)\.pdf$/i
        );

      if (!match) return [];

      const detectedName =
        match[1]
          .replace(/[_-]+/g, " ")
          .trim();

      if (!detectedName) return [];

      const rowIndex =
        getNamedStudentRow(
          file,
          students
        );

      if (rowIndex !== null) {
        return [];
      }

      return [
        [
          fileKey,
          {
            status:
              "not-found",
            detectedName,
          },
        ] as const,
      ];
    });

  const immediateNamedMatches =
    selectedFiles
      .map((file) => ({
        file,
        fileKey:
          getDocumentFileKey(file),
        rowIndex:
          getNamedStudentRow(
            file,
            students
          ),
      }))
      .filter(
        (
          item
        ): item is ImmediateNamedMatch =>
          item.rowIndex !== null
      );

  const immediateNamedRows = [
    ...new Set(
      immediateNamedMatches.map(
        (item) => item.rowIndex
      )
    ),
  ];

  const notFoundFileKeys =
    new Set(
      filenameIssueEntries.map(
        ([fileKey]) => fileKey
      )
    );

  const allSelectedNotFound =
    selectedFiles.length > 0 &&
    notFoundFileKeys.size ===
      selectedFiles.length;

  return {
    selectedKeys,
    filenameIssueEntries:
      filenameIssueEntries as readonly (
        readonly [
          string,
          FilenameMatchIssue,
        ]
      )[],
    immediateNamedMatches,
    immediateNamedRows,
    allSelectedNotFound,
  };
}