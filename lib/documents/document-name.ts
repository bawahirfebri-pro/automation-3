export function extractStudentNameFromFilename(
  filename: string
): string {
  return filename
    .replace(/_kk\.pdf$/i, "")
    .replace(/_akta\.pdf$/i, "")
    .replace(/\.pdf$/i, "")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
}

import type { ExtractedDocumentType, FileExtractionState } from "@/types/extraction";
import { toNameCase } from "@/lib/documents/document-helpers";

export function getExtractedDocumentName(documentType: ExtractedDocumentType | null, extraction: FileExtractionState | null | undefined): string {
  if (!extraction || !documentType) return "";
  if (documentType === "akta" || documentType === "both") {
    const nama = extraction.akta?.nama_anak?.trim() ?? "";
    return nama ? toNameCase(nama) : "";
  }
  return "";
}