import { getDocumentFileKey } from "@/lib/documents/document-file-key";
import { toNameCase } from "@/lib/documents/document-helpers";
import { normalizeStudentName } from "@/lib/students/student-matcher";

import { createCanonicalFileName } from "@/features/student/lib/documents/canonical-file-name";
import type { FilenameMatchIssue } from "@/features/student/lib/get-filename-match-issues";

import type { FileExtractionState } from "@/types/extraction";

interface Params {
  files: File[];
  processedFileKeys: string[];
  fileExtractions: Record<string, FileExtractionState>;
  filenameMatchIssues: Record<string, FilenameMatchIssue>;
}

interface DuplicateAktaCandidate {
  fileKey: string;
  fileName: string;
  canonicalName: string;
  identityKey: string;
}

export function planDuplicateAktaFiles({
  files,
  processedFileKeys,
  fileExtractions,
  filenameMatchIssues,
}: Params): string[] {
  if (files.length <= 1) {
    return [];
  }

  const processedSet = new Set(processedFileKeys);

  const candidates = files
    .map((file): DuplicateAktaCandidate | null => {
      const fileKey = getDocumentFileKey(file);
      const extraction = fileExtractions[fileKey];
      const issue = filenameMatchIssues[fileKey];

      if (!processedSet.has(fileKey)) {
        return null;
      }

      if (issue?.status !== "not-found") {
        return null;
      }

      if (!extraction?.akta) {
        return null;
      }

      const extractedName = extraction.akta.nama_anak?.trim() ?? "";

      if (!extractedName) {
        return null;
      }

      return {
        fileKey,
        fileName: file.name,
        canonicalName: createCanonicalFileName(toNameCase(extractedName), "akta"),
        identityKey: `${normalizeStudentName(extractedName)}::akta`,
      };
    })
    .filter((item): item is DuplicateAktaCandidate => Boolean(item));

  if (candidates.length <= 1) {
    return [];
  }

  const groups = new Map<string, DuplicateAktaCandidate[]>();

  candidates.forEach((candidate) => {
    const group = groups.get(candidate.identityKey) ?? [];

    group.push(candidate);
    groups.set(candidate.identityKey, group);
  });

  const duplicateFileKeys = new Set<string>();

  groups.forEach((group) => {
    if (group.length <= 1) {
      return;
    }

    /*
     * Prioritas file yang dipertahankan:
     * 1. Nama file asli sudah canonical.
     * 2. Jika tidak ada, file pertama.
     */
    const keeper =
      group.find((item) => item.fileName.toLowerCase() === item.canonicalName.toLowerCase()) ??
      group[0];

    group.forEach((item) => {
      if (item.fileKey !== keeper.fileKey) {
        duplicateFileKeys.add(item.fileKey);
      }
    });
  });

  return [...duplicateFileKeys];
}
