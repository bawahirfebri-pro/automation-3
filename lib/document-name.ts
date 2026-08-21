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