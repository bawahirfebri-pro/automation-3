import { getDocumentFileKey } from "@/lib/documents/document-file-key";

export function toNameCase(value: string): string { return value.trim().toLowerCase().replace(/\b\p{L}/gu, (char) => char.toUpperCase()); }
export function isValidKkNumber(value: string): boolean { return /^\d{16}$/.test(value.replace(/\D/g, "")); }

export function dedupeDocumentFiles(inputFiles: File[]): File[] {
  const seen = new Set<string>();
  return inputFiles.filter((file) => {
    const fileKey = getDocumentFileKey(file);
    if (seen.has(fileKey)) return false;
    seen.add(fileKey);
    return true;
  });
}