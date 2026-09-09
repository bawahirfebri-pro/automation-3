const STUDENT_DOCUMENT_EXTRACTION_PATH = "/students/document-extraction";

export function getNikFromPathname(pathname: string): string {
  return (
    pathname.match(/^\/students\/document-extraction\/(\d{16})\/?$/)?.[1] ??
    pathname.match(/^\/(\d{16})\/?$/)?.[1] ??
    ""
  );
}

export function setStudentUrl(nik: string | null | undefined) {
  if (typeof window === "undefined") return;

  const normalizedNik = (nik ?? "").replace(/\D/g, "");

  const nextPath = /^\d{16}$/.test(normalizedNik)
    ? `${STUDENT_DOCUMENT_EXTRACTION_PATH}/${normalizedNik}`
    : STUDENT_DOCUMENT_EXTRACTION_PATH;

  if (window.location.pathname !== nextPath) {
    window.history.pushState(null, "", nextPath);
  }
}

export function clearStudentUrl() {
  if (
    typeof window === "undefined" ||
    window.location.pathname === STUDENT_DOCUMENT_EXTRACTION_PATH
  ) {
    return;
  }

  window.history.pushState(null, "", STUDENT_DOCUMENT_EXTRACTION_PATH);
}
