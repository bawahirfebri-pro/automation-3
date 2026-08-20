export const extractStudentName = (filename: string): string => {
  return filename
    .toLowerCase()
    .replace(/_kk\.pdf$/i, "")
    .replace(/_akta\.pdf$/i, "")
    .replace(/\.pdf$/i, "")
    .replace(/_/g, " ")
    .trim();
};