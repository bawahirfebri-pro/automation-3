import { getDocumentFileKey } from "@/lib/documents/document-file-key";
import { dedupeDocumentFiles } from "@/lib/documents/document-helpers";

import { planUploadSessionMerge } from "./upload-session-planner";

interface Params {
  files: File[];
  pendingUploadFileKeys: string[];
  incomingFiles: File[];
  incomingRows: number[];
  hasMatchedIncomingStudent: boolean;
  rawRowsByFile: Record<string, number[]>;
  fileStudentScopes: Record<string, number[]>;
  selectedStudentRow: number | null;
}

export type PendingUploadTransition =
  | {
      mode: "replace-incoming";
      oldFiles: File[];
      oldFileKeys: string[];
      finalFiles: File[];
      finalFileKeys: string[];
      nextScopes: Record<string, number[]>;
      nextSelectedStudentRow: null;
    }
  | {
      mode: "merge";
      oldFiles: File[];
      oldFileKeys: string[];
      removedOldFiles: File[];
      removedOldFileKeys: string[];
      finalFiles: File[];
      finalFileKeys: string[];
      nextScopes: Record<string, number[]>;
      nextSelectedStudentRow: number | null;
    };

export function planPendingUploadTransition({
  files,
  pendingUploadFileKeys,
  incomingFiles,
  incomingRows,
  hasMatchedIncomingStudent,
  rawRowsByFile,
  fileStudentScopes,
  selectedStudentRow,
}: Params): PendingUploadTransition {
  const pendingSet = new Set(pendingUploadFileKeys);

  const oldFiles = files.filter((file) => !pendingSet.has(getDocumentFileKey(file)));

  const oldFileKeys = oldFiles.map(getDocumentFileKey);

  if (!hasMatchedIncomingStudent) {
    return {
      mode: "replace-incoming",
      oldFiles,
      oldFileKeys,
      finalFiles: incomingFiles,
      finalFileKeys: incomingFiles.map(getDocumentFileKey),
      nextScopes: {},
      nextSelectedStudentRow: null,
    };
  }

  const { keptOldFiles, removedOldFiles, nextScopes } = planUploadSessionMerge({
    existingFiles: oldFiles,
    incomingRows,
    rawRowsByFile,
    initialScopes: fileStudentScopes,
  });

  pendingUploadFileKeys.forEach((fileKey) => {
    delete nextScopes[fileKey];
  });

  const finalFiles = dedupeDocumentFiles([...keptOldFiles, ...incomingFiles]);

  const nextSelectedStudentRow =
    selectedStudentRow !== null && !incomingRows.includes(selectedStudentRow)
      ? (incomingRows[0] ?? null)
      : selectedStudentRow;

  return {
    mode: "merge",
    oldFiles,
    oldFileKeys,
    removedOldFiles,
    removedOldFileKeys: removedOldFiles.map(getDocumentFileKey),
    finalFiles,
    finalFileKeys: finalFiles.map(getDocumentFileKey),
    nextScopes,
    nextSelectedStudentRow,
  };
}
