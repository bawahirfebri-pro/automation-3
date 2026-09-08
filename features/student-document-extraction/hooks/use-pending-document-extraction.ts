import { useEffect, useMemo } from "react";
import { getDocumentFileKey } from "@/lib/documents/document-file-key";

interface Params { files: File[]; processedFileKeys: string[]; isExtracting: boolean; extract: (files: File[]) => void | Promise<unknown>; }

export function usePendingDocumentExtraction({ files, processedFileKeys, isExtracting, extract }: Params) {
  const pendingFiles = useMemo(() => {
    const processed = new Set(processedFileKeys);
    return files.filter((file) => !processed.has(getDocumentFileKey(file)));
  }, [files, processedFileKeys]);

  const hasPendingFiles = pendingFiles.length > 0;

  useEffect(() => {
    if (files.length === 0 || isExtracting || pendingFiles.length === 0) return;
    console.log("[EXTRACT PENDING FILES]", pendingFiles.map((file) => ({ name: file.name, key: getDocumentFileKey(file), size: file.size })));
    void extract(pendingFiles);
  }, [files, pendingFiles, isExtracting, extract]);

  return { pendingFiles, hasPendingFiles };
}