import { describe, expect, it } from "vitest";
import { planUploadSessionMerge } from "./upload-session-planner";
import { getDocumentFileKey } from "@/lib/documents/document-file-key";

function createFile(
  name: string,
  size: number,
  lastModified: number
): File {
  return new File(["x"], name, {
    type: "application/pdf",
    lastModified,
  });
}

describe("planUploadSessionMerge", () => {
  it("mempertahankan file lama jika RAW overlap dengan incoming rows dan mempersempit scope", () => {
    const file = createFile(
      "shared-kk.pdf",
      1,
      100
    );

    const fileKey =
      getDocumentFileKey(file);

    const result =
      planUploadSessionMerge({
        existingFiles: [file],
        incomingRows: [20],
        rawRowsByFile: {
          [fileKey]: [10, 20],
        },
        initialScopes: {
          [fileKey]: [10, 20],
        },
      });

    expect(result.keptOldFiles).toEqual([
      file,
    ]);

    expect(
      result.removedOldFiles
    ).toEqual([]);

    expect(
      result.nextScopes[fileKey]
    ).toEqual([20]);
  });

  it("menghapus file lama jika RAW tidak overlap dengan incoming rows", () => {
    const file = createFile(
      "old.pdf",
      1,
      100
    );

    const fileKey =
      getDocumentFileKey(file);

    const result =
      planUploadSessionMerge({
        existingFiles: [file],
        incomingRows: [30],
        rawRowsByFile: {
          [fileKey]: [10, 20],
        },
        initialScopes: {
          [fileKey]: [10],
        },
      });

    expect(
      result.keptOldFiles
    ).toEqual([]);

    expect(
      result.removedOldFiles
    ).toEqual([file]);

    expect(
      result.nextScopes[fileKey]
    ).toBeUndefined();
  });

  it("mempertahankan file lama tanpa RAW membership", () => {
    const file = createFile(
      "unknown.pdf",
      1,
      100
    );

    const fileKey =
      getDocumentFileKey(file);

    const result =
      planUploadSessionMerge({
        existingFiles: [file],
        incomingRows: [10],
        rawRowsByFile: {
          [fileKey]: [],
        },
        initialScopes: {},
      });

    expect(
      result.keptOldFiles
    ).toEqual([file]);

    expect(
      result.removedOldFiles
    ).toEqual([]);
  });

  it("mempertahankan scope awal untuk file tanpa RAW membership", () => {
    const file = createFile(
      "unknown.pdf",
      1,
      100
    );

    const fileKey =
      getDocumentFileKey(file);

    const result =
      planUploadSessionMerge({
        existingFiles: [file],
        incomingRows: [10],
        rawRowsByFile: {
          [fileKey]: [],
        },
        initialScopes: {
          [fileKey]: [99],
        },
      });

    expect(
      result.nextScopes[fileKey]
    ).toEqual([99]);
  });
});