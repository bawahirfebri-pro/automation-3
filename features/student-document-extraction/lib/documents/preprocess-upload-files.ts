import { getKkPageIdentityWithTimeout } from "@/features/student-document-extraction/lib/api/kk-page-identity";
import { dedupeDocumentFiles, isValidKkNumber } from "@/lib/documents/document-helpers";
import { groupKkPages, type KkPageIdentityResult } from "@/features/student-document-extraction/lib/documents/kk-page-grouper";
import { getPdfPageCount, mergePdfParts, splitPdfByPage } from "@/features/student-document-extraction/lib/documents/pdf-splitter";

export async function preprocessUploadFiles(pickedFiles: File[]): Promise<File[]> {
  const selectedFiles: File[] = [];

  for (const file of pickedFiles) {
    try {
      const pageCount = await getPdfPageCount(file);
      if (pageCount <= 1) { selectedFiles.push(file); continue; }

      console.log("[PDF PREPROCESS] mulai", { file: file.name, pageCount });
      const parts = await splitPdfByPage(file);
      console.log("[PDF PREPROCESS] split selesai", parts.map((part) => part.file.name));

      const identityResults = await Promise.all(parts.map(async (part): Promise<KkPageIdentityResult> => {
        try {
          const identity = await getKkPageIdentityWithTimeout(part.file);
          console.log("[KK PAGE IDENTITY]", { page: part.pageNumber, documentType: identity.documentType, noKk: identity.noKk, kepala: identity.namaKepalaKeluarga });
          return { part, documentType: identity.documentType, noKk: identity.noKk, namaKepalaKeluarga: identity.namaKepalaKeluarga };
        } catch (error) {
          console.error("[KK PAGE IDENTITY] gagal", part.file.name, error);
          return { part, documentType: "unknown", noKk: "", namaKepalaKeluarga: "" };
        }
      }));

      const kkIdentityResults = identityResults.filter((item) => item.documentType === "kk");
      const aktaIdentityResults = identityResults.filter((item) => item.documentType === "akta");
      const unknownIdentityResults = identityResults.filter((item) => item.documentType === "unknown");
      const hasConfirmedKk = kkIdentityResults.length > 0;
      const fallbackKkCandidates = hasConfirmedKk ? unknownIdentityResults : [];
      const ignoredIdentityResults = hasConfirmedKk ? aktaIdentityResults : [...aktaIdentityResults, ...unknownIdentityResults];

      if (ignoredIdentityResults.length > 0) console.log("[PDF PREPROCESS] halaman non-KK diabaikan", ignoredIdentityResults.map((item) => ({ page: item.part.pageNumber, documentType: item.documentType })));

      const validKkPageCount = kkIdentityResults.filter((item) => isValidKkNumber(item.noKk)).length;
      const hasAnyKk = kkIdentityResults.length > 0;

      if (!hasAnyKk) {
        console.warn("[PDF PREPROCESS] tidak ditemukan halaman KK, gunakan file asli", { file: file.name, pages: identityResults.map((item) => ({ page: item.part.pageNumber, documentType: item.documentType, noKk: item.noKk })) });
        selectedFiles.push(file);
        continue;
      }

      console.log("[PDF PREPROCESS] halaman KK terdeteksi", { file: file.name, totalPages: identityResults.length, kkPages: kkIdentityResults.length, validKkPages: validKkPageCount, ignoredPages: ignoredIdentityResults.length });

      const groups = groupKkPages(kkIdentityResults);
      console.log("[KK PAGE GROUPS]", groups.map((group) => ({ group: group.groupIndex + 1, noKk: group.noKk || "TIDAK TERBACA", pages: group.pageNumbers })));

      const mergedFiles = await Promise.all(groups.map((group) => mergePdfParts(file.name, group.parts, group.groupIndex + 1)));
      if (mergedFiles.length === 0) throw new Error("Tidak ada hasil merge KK.");

      console.log("[KK MERGED]", mergedFiles.map((mergedFile) => ({ name: mergedFile.name, size: mergedFile.size })));
      selectedFiles.push(...mergedFiles);

      if (fallbackKkCandidates.length > 0) {
        selectedFiles.push(...fallbackKkCandidates.map((item) => item.part.file));
        console.log("[PDF PREPROCESS] halaman unknown diteruskan ke extractor utama", fallbackKkCandidates.map((item) => ({ page: item.part.pageNumber, file: item.part.file.name })));
      }
    } catch (error) {
      console.error("[PDF PREPROCESS] gagal, fallback ke file asli", file.name, error);
      selectedFiles.push(file);
    }
  }

  return dedupeDocumentFiles(selectedFiles);
}