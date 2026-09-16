import { getDocumentFileKey } from "@/lib/documents/document-file-key";

interface Params {
  pendingUploadFileKeys: string[];
  files: File[];
  fileExtractions: Record<string, unknown>;
  documentTypes: Record<string, string | undefined>;
  fileResolutionComplete: Record<string, boolean>;
  aiMatchingFileKeys: string[];
  failedFileKeySet: ReadonlySet<string>;
  rawRowsByFile: Record<string, number[]>;
}

export function getPendingUploadBatchState({
  pendingUploadFileKeys,
  files,
  fileExtractions,
  documentTypes,
  fileResolutionComplete,
  aiMatchingFileKeys,
  failedFileKeySet,
  rawRowsByFile,
}: Params) {
  const pendingSet = new Set(pendingUploadFileKeys);

  const incomingFiles = files.filter((file) => pendingSet.has(getDocumentFileKey(file)));

  const allIncomingFilesPresent = incomingFiles.length === pendingUploadFileKeys.length;

  if (!allIncomingFilesPresent) {
    return {
      pendingSet,
      incomingFiles,
      incomingReady: false,
      incomingRows: [] as number[],
      hasMatchedIncomingStudent: false,
    };
  }

  const incomingReady = pendingUploadFileKeys.every((fileKey) => {
    const isFailed = failedFileKeySet.has(fileKey);

    if (isFailed) {
      return true;
    }

    const extractionReady = Boolean(fileExtractions[fileKey]);

    const documentType = documentTypes[fileKey];

    const supportedDocument =
      documentType === "kk" || documentType === "akta" || documentType === "both";

    const unsupportedDocument = extractionReady && !supportedDocument;

    if (unsupportedDocument) {
      return true;
    }

    const resolutionReady = Boolean(fileResolutionComplete[fileKey]);

    const aiReady = !aiMatchingFileKeys.includes(fileKey);

    return extractionReady && resolutionReady && aiReady;
  });

  if (!incomingReady) {
    return {
      pendingSet,
      incomingFiles,
      incomingReady: false,
      incomingRows: [] as number[],
      hasMatchedIncomingStudent: false,
    };
  }

  const incomingRows = [
    ...new Set(pendingUploadFileKeys.flatMap((fileKey) => rawRowsByFile[fileKey] ?? [])),
  ];

  return {
    pendingSet,
    incomingFiles,
    incomingReady: true,
    incomingRows,
    hasMatchedIncomingStudent: incomingRows.length > 0,
  };
}
