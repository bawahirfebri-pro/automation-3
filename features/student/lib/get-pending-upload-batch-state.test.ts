import { describe, expect, it } from "vitest";

import { getDocumentFileKey } from "@/lib/documents/document-file-key";

import { getPendingUploadBatchState } from "./get-pending-upload-batch-state";

function createFile(name: string, lastModified: number): File {
  return new File(["x"], name, { type: "application/pdf", lastModified });
}

describe("getPendingUploadBatchState", () => {
  it("belum ready jika tidak semua pending file masih ada di active files", () => {
    const fileA = createFile("Budi_KK.pdf", 100);
    const fileB = createFile("Budi_Akta.pdf", 200);

    const fileKeyA = getDocumentFileKey(fileA);
    const fileKeyB = getDocumentFileKey(fileB);

    const result = getPendingUploadBatchState({
      pendingUploadFileKeys: [fileKeyA, fileKeyB],
      files: [fileA],
      fileExtractions: {},
      documentTypes: {},
      fileResolutionComplete: {},
      aiMatchingFileKeys: [],
      failedFileKeySet: new Set(),
      rawRowsByFile: {},
    });

    expect(result.incomingFiles).toEqual([fileA]);
    expect(result.incomingReady).toBe(false);
    expect(result.incomingRows).toEqual([]);
    expect(result.hasMatchedIncomingStudent).toBe(false);
  });

  it("belum ready jika extraction belum tersedia", () => {
    const file = createFile("Budi_KK.pdf", 100);
    const fileKey = getDocumentFileKey(file);

    const result = getPendingUploadBatchState({
      pendingUploadFileKeys: [fileKey],
      files: [file],
      fileExtractions: {},
      documentTypes: { [fileKey]: "kk" },
      fileResolutionComplete: { [fileKey]: true },
      aiMatchingFileKeys: [],
      failedFileKeySet: new Set(),
      rawRowsByFile: { [fileKey]: [10] },
    });

    expect(result.incomingReady).toBe(false);
    expect(result.incomingRows).toEqual([]);
  });

  it("belum ready jika student resolution belum complete", () => {
    const file = createFile("Budi_KK.pdf", 100);
    const fileKey = getDocumentFileKey(file);

    const result = getPendingUploadBatchState({
      pendingUploadFileKeys: [fileKey],
      files: [file],
      fileExtractions: { [fileKey]: {} },
      documentTypes: { [fileKey]: "kk" },
      fileResolutionComplete: { [fileKey]: false },
      aiMatchingFileKeys: [],
      failedFileKeySet: new Set(),
      rawRowsByFile: { [fileKey]: [10] },
    });

    expect(result.incomingReady).toBe(false);
  });

  it("belum ready selama AI matching masih berjalan", () => {
    const file = createFile("Budi_KK.pdf", 100);
    const fileKey = getDocumentFileKey(file);

    const result = getPendingUploadBatchState({
      pendingUploadFileKeys: [fileKey],
      files: [file],
      fileExtractions: { [fileKey]: {} },
      documentTypes: { [fileKey]: "kk" },
      fileResolutionComplete: { [fileKey]: true },
      aiMatchingFileKeys: [fileKey],
      failedFileKeySet: new Set(),
      rawRowsByFile: { [fileKey]: [10] },
    });

    expect(result.incomingReady).toBe(false);
  });

  it("failed file dianggap selesai agar batch tidak menggantung", () => {
    const file = createFile("rusak.pdf", 100);
    const fileKey = getDocumentFileKey(file);

    const result = getPendingUploadBatchState({
      pendingUploadFileKeys: [fileKey],
      files: [file],
      fileExtractions: {},
      documentTypes: {},
      fileResolutionComplete: {},
      aiMatchingFileKeys: [],
      failedFileKeySet: new Set([fileKey]),
      rawRowsByFile: {},
    });

    expect(result.incomingReady).toBe(true);
    expect(result.incomingRows).toEqual([]);
    expect(result.hasMatchedIncomingStudent).toBe(false);
  });

  it("dokumen unsupported yang sudah selesai extraction dianggap selesai", () => {
    const file = createFile("dokumen-lain.pdf", 100);
    const fileKey = getDocumentFileKey(file);

    const result = getPendingUploadBatchState({
      pendingUploadFileKeys: [fileKey],
      files: [file],
      fileExtractions: { [fileKey]: {} },
      documentTypes: { [fileKey]: "unknown" },
      fileResolutionComplete: { [fileKey]: false },
      aiMatchingFileKeys: [],
      failedFileKeySet: new Set(),
      rawRowsByFile: {},
    });

    expect(result.incomingReady).toBe(true);
    expect(result.incomingRows).toEqual([]);
    expect(result.hasMatchedIncomingStudent).toBe(false);
  });

  it("menggabungkan RAW rows dari seluruh incoming file tanpa duplikasi", () => {
    const kk = createFile("Budi_KK.pdf", 100);
    const akta = createFile("Budi_Akta.pdf", 200);

    const kkKey = getDocumentFileKey(kk);
    const aktaKey = getDocumentFileKey(akta);

    const result = getPendingUploadBatchState({
      pendingUploadFileKeys: [kkKey, aktaKey],
      files: [kk, akta],
      fileExtractions: { [kkKey]: {}, [aktaKey]: {} },
      documentTypes: { [kkKey]: "kk", [aktaKey]: "akta" },
      fileResolutionComplete: { [kkKey]: true, [aktaKey]: true },
      aiMatchingFileKeys: [],
      failedFileKeySet: new Set(),
      rawRowsByFile: { [kkKey]: [10, 20], [aktaKey]: [20] },
    });

    expect(result.incomingReady).toBe(true);
    expect(result.incomingRows).toEqual([10, 20]);
    expect(result.hasMatchedIncomingStudent).toBe(true);
  });

  it("batch ready tanpa RAW membership tetap ditandai tidak memiliki matched student", () => {
    const file = createFile("unknown.pdf", 100);
    const fileKey = getDocumentFileKey(file);

    const result = getPendingUploadBatchState({
      pendingUploadFileKeys: [fileKey],
      files: [file],
      fileExtractions: { [fileKey]: {} },
      documentTypes: { [fileKey]: "unknown" },
      fileResolutionComplete: { [fileKey]: false },
      aiMatchingFileKeys: [],
      failedFileKeySet: new Set(),
      rawRowsByFile: { [fileKey]: [] },
    });

    expect(result.incomingReady).toBe(true);
    expect(result.incomingRows).toEqual([]);
    expect(result.hasMatchedIncomingStudent).toBe(false);
  });
});
