import { describe, expect, it } from "vitest";

import { getDocumentFileKey } from "@/lib/documents/document-file-key";

import { planPendingUploadTransition } from "./pending-upload-transition";

function createFile(name: string, lastModified: number): File {
  return new File(["x"], name, { type: "application/pdf", lastModified });
}

describe("planPendingUploadTransition", () => {
  it("mengganti session lama dengan incoming batch jika tidak ada matched student", () => {
    const oldFile = createFile("old.pdf", 100);

    const incoming = createFile("incoming.pdf", 200);

    const incomingKey = getDocumentFileKey(incoming);

    const result = planPendingUploadTransition({
      files: [oldFile, incoming],
      pendingUploadFileKeys: [incomingKey],
      incomingFiles: [incoming],
      incomingRows: [],
      hasMatchedIncomingStudent: false,
      rawRowsByFile: {},
      fileStudentScopes: {},
      selectedStudentRow: 10,
    });

    expect(result.mode).toBe("replace-incoming");

    expect(result.finalFiles).toEqual([incoming]);

    expect(result.nextSelectedStudentRow).toBeNull();

    expect(result.nextScopes).toEqual({});
  });

  it("mempertahankan old file yang RAW overlap dengan incoming rows", () => {
    const shared = createFile("shared.pdf", 100);

    const incoming = createFile("incoming.pdf", 200);

    const sharedKey = getDocumentFileKey(shared);

    const incomingKey = getDocumentFileKey(incoming);

    const result = planPendingUploadTransition({
      files: [shared, incoming],
      pendingUploadFileKeys: [incomingKey],
      incomingFiles: [incoming],
      incomingRows: [20],
      hasMatchedIncomingStudent: true,
      rawRowsByFile: { [sharedKey]: [10, 20] },
      fileStudentScopes: { [sharedKey]: [10, 20] },
      selectedStudentRow: 20,
    });

    expect(result.mode).toBe("merge");

    if (result.mode !== "merge") {
      throw new Error("Expected merge");
    }

    expect(result.finalFiles).toContain(shared);

    expect(result.nextScopes[sharedKey]).toEqual([20]);

    expect(result.nextSelectedStudentRow).toBe(20);
  });

  it("membuang old file yang tidak overlap dengan incoming rows", () => {
    const oldFile = createFile("old.pdf", 100);

    const incoming = createFile("incoming.pdf", 200);

    const oldKey = getDocumentFileKey(oldFile);

    const incomingKey = getDocumentFileKey(incoming);

    const result = planPendingUploadTransition({
      files: [oldFile, incoming],
      pendingUploadFileKeys: [incomingKey],
      incomingFiles: [incoming],
      incomingRows: [20],
      hasMatchedIncomingStudent: true,
      rawRowsByFile: { [oldKey]: [10] },
      fileStudentScopes: { [oldKey]: [10] },
      selectedStudentRow: 10,
    });

    expect(result.mode).toBe("merge");

    if (result.mode !== "merge") {
      throw new Error("Expected merge");
    }

    expect(result.removedOldFileKeys).toEqual([oldKey]);

    expect(result.finalFiles).toEqual([incoming]);

    expect(result.nextSelectedStudentRow).toBe(20);
  });

  it("membersihkan scope milik pending incoming files", () => {
    const incoming = createFile("incoming.pdf", 100);

    const incomingKey = getDocumentFileKey(incoming);

    const result = planPendingUploadTransition({
      files: [incoming],
      pendingUploadFileKeys: [incomingKey],
      incomingFiles: [incoming],
      incomingRows: [20],
      hasMatchedIncomingStudent: true,
      rawRowsByFile: {},
      fileStudentScopes: { [incomingKey]: [20] },
      selectedStudentRow: null,
    });

    expect(result.mode).toBe("merge");

    if (result.mode !== "merge") {
      throw new Error("Expected merge");
    }

    expect(result.nextScopes[incomingKey]).toBeUndefined();
  });
});
