import { describe, expect, it } from "vitest";

import type { FileExtractionState } from "@/types/extraction";

import { planSavedStudentSessionCleanup } from "./saved-student-session-cleanup";

function createExtraction(hasKk: boolean): FileExtractionState {
  return {
    type: hasKk ? "kk" : "akta",
    kk: hasKk ? ({} as never) : null,
    akta: hasKk ? null : ({} as never),
    modelUsedKk: "",
    modelUsedAkta: "",
  };
}

describe("planSavedStudentSessionCleanup", () => {
  it("shared KK hanya menghapus virtual membership student yang disimpan", () => {
    const result = planSavedStudentSessionCleanup({
      studentRowIndex: 10,
      currentFileKeys: ["shared-kk"],
      fileStudentScopes: {},
      rawRowsByFile: { "shared-kk": [10, 20] },
      scopedRowsByFile: { "shared-kk": [10, 20] },
      fileExtractions: { "shared-kk": createExtraction(true) },
    });

    expect(result.nextScopes).toEqual({ "shared-kk": [20] });

    expect(result.removedFileKeys).toEqual([]);
  });

  it("shared KK dihapus fisik jika student adalah scoped member terakhir", () => {
    const result = planSavedStudentSessionCleanup({
      studentRowIndex: 10,
      currentFileKeys: ["shared-kk"],
      fileStudentScopes: { "shared-kk": [10] },
      rawRowsByFile: { "shared-kk": [10, 20] },
      scopedRowsByFile: { "shared-kk": [10] },
      fileExtractions: { "shared-kk": createExtraction(true) },
    });

    expect(result.nextScopes).toEqual({});
    expect(result.removedFileKeys).toEqual(["shared-kk"]);
  });

  it("dokumen non-shared dihapus fisik setelah student disimpan", () => {
    const result = planSavedStudentSessionCleanup({
      studentRowIndex: 10,
      currentFileKeys: ["akta"],
      fileStudentScopes: {},
      rawRowsByFile: { akta: [10] },
      scopedRowsByFile: { akta: [10] },
      fileExtractions: { akta: createExtraction(false) },
    });

    expect(result.nextScopes).toEqual({});
    expect(result.removedFileKeys).toEqual(["akta"]);
  });

  it("file milik student lain tidak disentuh", () => {
    const result = planSavedStudentSessionCleanup({
      studentRowIndex: 10,
      currentFileKeys: ["akta-b"],
      fileStudentScopes: { "akta-b": [20] },
      rawRowsByFile: { "akta-b": [20] },
      scopedRowsByFile: { "akta-b": [20] },
      fileExtractions: { "akta-b": createExtraction(false) },
    });

    expect(result.nextScopes).toEqual({ "akta-b": [20] });

    expect(result.removedFileKeys).toEqual([]);
  });

  it("bisa menghapus physical Akta sambil mempertahankan shared KK", () => {
    const result = planSavedStudentSessionCleanup({
      studentRowIndex: 10,
      currentFileKeys: ["shared-kk", "akta-a"],
      fileStudentScopes: {},
      rawRowsByFile: { "shared-kk": [10, 20], "akta-a": [10] },
      scopedRowsByFile: { "shared-kk": [10, 20], "akta-a": [10] },
      fileExtractions: { "shared-kk": createExtraction(true), "akta-a": createExtraction(false) },
    });

    expect(result.nextScopes).toEqual({ "shared-kk": [20] });

    expect(result.removedFileKeys).toEqual(["akta-a"]);
  });
});
