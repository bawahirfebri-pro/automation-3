import type { ExtractedDocumentType } from "@/hooks/use-document-extraction";

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ");
}

export function createCanonicalFileName(
  studentName: string,
  documentType: ExtractedDocumentType
): string {
  const safeStudentName = sanitizeFileName(studentName);

  if (!safeStudentName) {
    return "";
  }

  if (documentType === "kk") {
    return `${safeStudentName}_KK.pdf`;
  }

  if (documentType === "akta") {
    return `${safeStudentName}_Akta.pdf`;
  }

  return `${safeStudentName}_KK-Akta.pdf`;
}