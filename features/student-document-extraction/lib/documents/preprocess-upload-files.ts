import { dedupeDocumentFiles } from "@/lib/documents/document-helpers";

import { getKkPageIdentityWithTimeout } from "@/features/student-document-extraction/lib/api/kk-page-identity";
import {
  groupKkPages,
  type KkPageIdentityResult,
} from "@/features/student-document-extraction/lib/documents/kk-page-grouper";
import {
  getPdfPageCount,
  mergePdfParts,
  splitPdfByPage,
} from "@/features/student-document-extraction/lib/documents/pdf-splitter";

export async function preprocessUploadFiles(pickedFiles: File[]): Promise<File[]> {
  const selectedFiles: File[] = [];

  for (const file of pickedFiles) {
    try {
      const pageCount = await getPdfPageCount(file);
      if (pageCount <= 1) {
        selectedFiles.push(file);
        continue;
      }

      const parts = await splitPdfByPage(file);

      const identityResults = await Promise.all(
        parts.map(async (part): Promise<KkPageIdentityResult> => {
          try {
            const identity = await getKkPageIdentityWithTimeout(part.file);

            return {
              part,
              documentType: identity.documentType,
              noKk: identity.noKk,
              namaKepalaKeluarga: identity.namaKepalaKeluarga,
            };
          } catch (error) {
            console.error("[KK PAGE IDENTITY] gagal", part.file.name, error);
            return { part, documentType: "unknown", noKk: "", namaKepalaKeluarga: "" };
          }
        }),
      );

      const kkIdentityResults = identityResults.filter((item) => item.documentType === "kk");
      const unknownIdentityResults = identityResults.filter(
        (item) => item.documentType === "unknown",
      );
      const hasConfirmedKk = kkIdentityResults.length > 0;
      const fallbackKkCandidates = hasConfirmedKk ? unknownIdentityResults : [];
      const hasAnyKk = kkIdentityResults.length > 0;

      if (!hasAnyKk) {
        console.warn("[PDF PREPROCESS] tidak ditemukan halaman KK, gunakan file asli", {
          file: file.name,
          pages: identityResults.map((item) => ({
            page: item.part.pageNumber,
            documentType: item.documentType,
            noKk: item.noKk,
          })),
        });
        selectedFiles.push(file);
        continue;
      }

      const groups = groupKkPages(kkIdentityResults);

      const mergedFiles = await Promise.all(
        groups.map((group) => mergePdfParts(file.name, group.parts, group.groupIndex + 1)),
      );
      if (mergedFiles.length === 0) throw new Error("Tidak ada hasil merge KK.");

      selectedFiles.push(...mergedFiles);

      if (fallbackKkCandidates.length > 0) {
        selectedFiles.push(...fallbackKkCandidates.map((item) => item.part.file));
      }
    } catch (error) {
      console.error("[PDF PREPROCESS] gagal, fallback ke file asli", file.name, error);
      selectedFiles.push(file);
    }
  }

  return dedupeDocumentFiles(selectedFiles);
}
