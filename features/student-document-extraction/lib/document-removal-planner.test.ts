import { describe, expect, it } from "vitest";

import { planDocumentRemoval } from "./document-removal-planner";

describe("planDocumentRemoval", () => {
  it("menghapus virtual student dari shared KK jika scoped member lain masih ada", () => {
    const result = planDocumentRemoval({
      hasKkExtraction: true,
      rawRows: [10, 20],
      scopedRows: [10, 20],
      studentRowIndex: 10,
    });

    expect(result).toEqual({ mode: "virtual", remainingRows: [20] });
  });

  it("menghapus physical file jika student adalah scoped member terakhir shared KK", () => {
    const result = planDocumentRemoval({
      hasKkExtraction: true,
      rawRows: [10, 20],
      scopedRows: [10],
      studentRowIndex: 10,
    });

    expect(result).toEqual({ mode: "physical", remainingRows: [] });
  });

  it("menghapus physical file jika KK bukan shared", () => {
    const result = planDocumentRemoval({
      hasKkExtraction: true,
      rawRows: [10],
      scopedRows: [10],
      studentRowIndex: 10,
    });

    expect(result).toEqual({ mode: "physical", remainingRows: [] });
  });

  it("menghapus physical file untuk dokumen non-KK", () => {
    const result = planDocumentRemoval({
      hasKkExtraction: false,
      rawRows: [10, 20],
      scopedRows: [10, 20],
      studentRowIndex: 10,
    });

    expect(result).toEqual({ mode: "physical", remainingRows: [] });
  });

  it("menghapus physical file jika tidak ada student aktif", () => {
    const result = planDocumentRemoval({
      hasKkExtraction: true,
      rawRows: [10, 20],
      scopedRows: [10, 20],
      studentRowIndex: null,
    });

    expect(result).toEqual({ mode: "physical", remainingRows: [] });
  });

  it("menghapus duplicate scoped rows sebelum menentukan remaining rows", () => {
    const result = planDocumentRemoval({
      hasKkExtraction: true,
      rawRows: [10, 20],
      scopedRows: [10, 20, 20],
      studentRowIndex: 10,
    });

    expect(result).toEqual({ mode: "virtual", remainingRows: [20] });
  });
});
