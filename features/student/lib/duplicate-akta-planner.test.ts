import { describe, expect, it } from "vitest";

import { getDocumentFileKey } from "@/lib/documents/document-file-key";

import type { AktaResult } from "@/types/akta";
import type { FileExtractionState } from "@/types/extraction";

import { planDuplicateAktaFiles } from "./duplicate-akta-planner";
import type { FilenameMatchIssue } from "./get-filename-match-issues";

function createFile(name: string, lastModified: number): File {
  return new File(["x"], name, { type: "application/pdf", lastModified });
}

function createAkta(namaAnak: string): AktaResult {
  return {
    no_akta_kelahiran: "",
    nama_anak: namaAnak,
    anak_ke: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    nama_ayah: "",
    nama_ibu: "",
  };
}

function createAktaExtraction(namaAnak: string): FileExtractionState {
  return { type: "akta", kk: null, akta: createAkta(namaAnak), modelUsedKk: "", modelUsedAkta: "" };
}

function createIssue(detectedName: string): FilenameMatchIssue {
  return { status: "not-found", detectedName };
}

describe("planDuplicateAktaFiles", () => {
  it("tidak menghasilkan duplicate jika hanya ada satu file", () => {
    const file = createFile("Budi Santoso_Akta.pdf", 100);

    const fileKey = getDocumentFileKey(file);

    const result = planDuplicateAktaFiles({
      files: [file],
      processedFileKeys: [fileKey],
      fileExtractions: { [fileKey]: createAktaExtraction("Budi Santoso") },
      filenameMatchIssues: { [fileKey]: createIssue("Budi Santoso") },
    });

    expect(result).toEqual([]);
  });

  it("mempertahankan file yang namanya canonical", () => {
    const canonical = createFile("Budi Santoso_Akta.pdf", 100);

    const duplicate = createFile("scan-001.pdf", 200);

    const canonicalKey = getDocumentFileKey(canonical);

    const duplicateKey = getDocumentFileKey(duplicate);

    const result = planDuplicateAktaFiles({
      files: [duplicate, canonical],
      processedFileKeys: [duplicateKey, canonicalKey],
      fileExtractions: {
        [duplicateKey]: createAktaExtraction("Budi Santoso"),
        [canonicalKey]: createAktaExtraction("Budi Santoso"),
      },
      filenameMatchIssues: {
        [duplicateKey]: createIssue("Budi Santoso"),
        [canonicalKey]: createIssue("Budi Santoso"),
      },
    });

    expect(result).toEqual([duplicateKey]);
  });

  it("mempertahankan file pertama jika tidak ada nama canonical", () => {
    const first = createFile("scan-a.pdf", 100);

    const second = createFile("scan-b.pdf", 200);

    const firstKey = getDocumentFileKey(first);
    const secondKey = getDocumentFileKey(second);

    const result = planDuplicateAktaFiles({
      files: [first, second],
      processedFileKeys: [firstKey, secondKey],
      fileExtractions: {
        [firstKey]: createAktaExtraction("Budi Santoso"),
        [secondKey]: createAktaExtraction("Budi Santoso"),
      },
      filenameMatchIssues: {
        [firstKey]: createIssue("Budi Santoso"),
        [secondKey]: createIssue("Budi Santoso"),
      },
    });

    expect(result).toEqual([secondKey]);
  });

  it("nama hasil extraction dibandingkan secara normalized", () => {
    const first = createFile("scan-a.pdf", 100);

    const second = createFile("scan-b.pdf", 200);

    const firstKey = getDocumentFileKey(first);
    const secondKey = getDocumentFileKey(second);

    const result = planDuplicateAktaFiles({
      files: [first, second],
      processedFileKeys: [firstKey, secondKey],
      fileExtractions: {
        [firstKey]: createAktaExtraction("BUDI SANTOSO"),
        [secondKey]: createAktaExtraction("  Budi   Santoso  "),
      },
      filenameMatchIssues: {
        [firstKey]: createIssue("Budi Santoso"),
        [secondKey]: createIssue("Budi Santoso"),
      },
    });

    expect(result).toEqual([secondKey]);
  });

  it("tidak menganggap nama anak berbeda sebagai duplicate", () => {
    const budi = createFile("scan-budi.pdf", 100);

    const siti = createFile("scan-siti.pdf", 200);

    const budiKey = getDocumentFileKey(budi);
    const sitiKey = getDocumentFileKey(siti);

    const result = planDuplicateAktaFiles({
      files: [budi, siti],
      processedFileKeys: [budiKey, sitiKey],
      fileExtractions: {
        [budiKey]: createAktaExtraction("Budi Santoso"),
        [sitiKey]: createAktaExtraction("Siti Aminah"),
      },
      filenameMatchIssues: {
        [budiKey]: createIssue("Budi Santoso"),
        [sitiKey]: createIssue("Siti Aminah"),
      },
    });

    expect(result).toEqual([]);
  });

  it("mengabaikan file yang belum processed", () => {
    const first = createFile("scan-a.pdf", 100);

    const second = createFile("scan-b.pdf", 200);

    const firstKey = getDocumentFileKey(first);
    const secondKey = getDocumentFileKey(second);

    const result = planDuplicateAktaFiles({
      files: [first, second],
      processedFileKeys: [firstKey],
      fileExtractions: {
        [firstKey]: createAktaExtraction("Budi Santoso"),
        [secondKey]: createAktaExtraction("Budi Santoso"),
      },
      filenameMatchIssues: {
        [firstKey]: createIssue("Budi Santoso"),
        [secondKey]: createIssue("Budi Santoso"),
      },
    });

    expect(result).toEqual([]);
  });

  it("mengabaikan file tanpa filename not-found issue", () => {
    const first = createFile("scan-a.pdf", 100);

    const second = createFile("scan-b.pdf", 200);

    const firstKey = getDocumentFileKey(first);
    const secondKey = getDocumentFileKey(second);

    const result = planDuplicateAktaFiles({
      files: [first, second],
      processedFileKeys: [firstKey, secondKey],
      fileExtractions: {
        [firstKey]: createAktaExtraction("Budi Santoso"),
        [secondKey]: createAktaExtraction("Budi Santoso"),
      },
      filenameMatchIssues: { [firstKey]: createIssue("Budi Santoso") },
    });

    expect(result).toEqual([]);
  });

  it("mengabaikan extraction yang tidak memiliki Akta", () => {
    const first = createFile("scan-a.pdf", 100);

    const second = createFile("scan-b.pdf", 200);

    const firstKey = getDocumentFileKey(first);
    const secondKey = getDocumentFileKey(second);

    const kkExtraction: FileExtractionState = {
      type: "kk",
      kk: {} as never,
      akta: null,
      modelUsedKk: "",
      modelUsedAkta: "",
    };

    const result = planDuplicateAktaFiles({
      files: [first, second],
      processedFileKeys: [firstKey, secondKey],
      fileExtractions: {
        [firstKey]: kkExtraction,
        [secondKey]: createAktaExtraction("Budi Santoso"),
      },
      filenameMatchIssues: {
        [firstKey]: createIssue("Budi Santoso"),
        [secondKey]: createIssue("Budi Santoso"),
      },
    });

    expect(result).toEqual([]);
  });
});
