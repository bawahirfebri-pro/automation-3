export function getDocumentFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}
