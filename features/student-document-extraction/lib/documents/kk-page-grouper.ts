import type {
  PdfPageSplitResult,
} from "@/features/student-document-extraction/lib/documents/pdf-splitter";

export interface KkPageIdentityResult {
  part: PdfPageSplitResult;
  documentType:
    | "kk"
    | "akta"
    | "unknown";
  noKk: string;
  namaKepalaKeluarga: string;
}

export interface KkPageGroup {
  groupIndex: number;
  noKk: string;
  namaKepalaKeluarga: string;
  parts: PdfPageSplitResult[];
  pageNumbers: number[];
}

function normalizeKkNumber(
  value: string
): string {
  return value
    .replace(/\D/g, "")
    .trim();
}

export function groupKkPages(
  identities: KkPageIdentityResult[]
): KkPageGroup[] {
  const sorted =
    [...identities].sort(
      (a, b) =>
        a.part.pageNumber -
        b.part.pageNumber
    );

  const groups:
    KkPageGroup[] = [];

  for (const item of sorted) {
    const noKk =
      normalizeKkNumber(
        item.noKk
      );

    const previousGroup =
      groups[
        groups.length - 1
      ];

    const canJoinPrevious =
      Boolean(noKk) &&
      Boolean(
        previousGroup?.noKk
      ) &&
      previousGroup.noKk ===
        noKk;

    if (canJoinPrevious) {
      previousGroup.parts.push(
        item.part
      );

      previousGroup.pageNumbers.push(
        item.part.pageNumber
      );

      if (
        !previousGroup
          .namaKepalaKeluarga &&
        item.namaKepalaKeluarga
      ) {
        previousGroup
          .namaKepalaKeluarga =
          item.namaKepalaKeluarga;
      }

      continue;
    }

    groups.push({
      groupIndex:
        groups.length,
      noKk,
      namaKepalaKeluarga:
        item.namaKepalaKeluarga,
      parts: [
        item.part,
      ],
      pageNumbers: [
        item.part.pageNumber,
      ],
    });
  }

  return groups;
}