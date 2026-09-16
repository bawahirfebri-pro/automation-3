import { getDocumentFileKey } from "@/lib/documents/document-file-key";

interface Params {
  existingFiles: File[];
  incomingRows: number[];
  rawRowsByFile: Record<string, number[]>;
  initialScopes: Record<string, number[]>;
}

export function planUploadSessionMerge({
  existingFiles,
  incomingRows,
  rawRowsByFile,
  initialScopes,
}: Params) {
  const incomingRowSet = new Set(incomingRows);
  const keptOldFiles: File[] = [];
  const removedOldFiles: File[] = [];
  const nextScopes: Record<string, number[]> = { ...initialScopes };

  existingFiles.forEach((file) => {
    const fileKey = getDocumentFileKey(file);
    const rawRows = rawRowsByFile[fileKey] ?? [];
    const overlapRows = rawRows.filter((rowIndex) => incomingRowSet.has(rowIndex));

    if (rawRows.length === 0) {
      keptOldFiles.push(file);
      return;
    }

    if (overlapRows.length > 0) {
      keptOldFiles.push(file);
      nextScopes[fileKey] = overlapRows;
      return;
    }

    removedOldFiles.push(file);
    delete nextScopes[fileKey];
  });

  return { keptOldFiles, removedOldFiles, nextScopes };
}
