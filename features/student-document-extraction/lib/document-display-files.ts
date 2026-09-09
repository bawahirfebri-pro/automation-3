import { getDocumentFileKey } from "@/lib/documents/document-file-key";
import { getExtractedDocumentName } from "@/lib/documents/document-name";

import { createCanonicalFileName } from "@/features/student-document-extraction/lib/documents/canonical-file-name";

import type { DocumentDisplayFile } from "@/types/document-file";
import type { ExtractedDocumentType, FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

interface Params {
  files: File[];
  documentTypes: Record<string, ExtractedDocumentType>;
  fileExtractions: Record<string, FileExtractionState>;
  scopedRowsByFile: Record<string, number[]>;
  students: StudentRecord[];
}

export function buildDocumentDisplayFiles({
  files,
  documentTypes,
  fileExtractions,
  scopedRowsByFile,
  students,
}: Params): DocumentDisplayFile[] {
  return files.flatMap((file): DocumentDisplayFile[] => {
    const fileKey = getDocumentFileKey(file);
    const extractedDocumentType = documentTypes[fileKey];
    const documentType =
      extractedDocumentType === "unknown" ? null : (extractedDocumentType ?? null);
    const rowIndexes = [...new Set(scopedRowsByFile[fileKey] ?? [])];

    if (!documentType || rowIndexes.length === 0) {
      const extraction = fileExtractions[fileKey];
      const extractedName = getExtractedDocumentName(documentType, extraction);
      const canonicalDocumentType =
        documentType === "both"
          ? extraction?.akta
            ? "akta"
            : extraction?.kk
              ? "kk"
              : null
          : documentType;
      const displayName =
        extractedName && canonicalDocumentType
          ? createCanonicalFileName(extractedName, canonicalDocumentType)
          : file.name;
      return [
        {
          file,
          fileKey,
          outputKey: fileKey,
          originalName: file.name,
          displayName,
          documentType,
          renamed: displayName !== file.name,
          studentRowIndex: null,
          studentName: extractedName,
          virtual: false,
        },
      ];
    }

    const matchedStudents = rowIndexes
      .map((rowIndex) => students.find((student) => student.rowIndex === rowIndex))
      .filter((student): student is StudentRecord => Boolean(student));

    if (matchedStudents.length === 0) {
      return [
        {
          file,
          fileKey,
          outputKey: fileKey,
          originalName: file.name,
          displayName: file.name,
          documentType,
          renamed: false,
          studentRowIndex: null,
          studentName: "",
          virtual: false,
        },
      ];
    }

    return matchedStudents.map((student): DocumentDisplayFile => {
      const canonicalDocumentType =
        documentType === "both" ? (fileExtractions[fileKey]?.akta ? "akta" : "kk") : documentType;
      const displayName = createCanonicalFileName(student.nama, canonicalDocumentType);

      return {
        file,
        fileKey,
        outputKey: `${fileKey}::${student.rowIndex}`,
        originalName: file.name,
        displayName,
        documentType,
        renamed: displayName !== file.name,
        studentRowIndex: student.rowIndex,
        studentName: student.nama,
        virtual: documentType === "kk" && matchedStudents.length > 1,
      };
    });
  });
}
