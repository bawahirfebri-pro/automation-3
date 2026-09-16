import { describe, expect, it } from "vitest";

import type { FileStudentMatch } from "@/lib/students/file-student-matcher";

import { getStudentFileMembership } from "./student-file-membership";

function createMatch(rowIndexes: number[]): FileStudentMatch {
  return { rowIndexes } as FileStudentMatch;
}

describe("getStudentFileMembership", () => {
  it("menggunakan RAW sebagai SCOPED saat scope tidak ada", () => {
    const result = getStudentFileMembership({
      currentFileKeys: ["file-a"],
      fileStudentMatches: { "file-a": createMatch([10, 20]) },
      fileStudentScopes: {},
    });

    expect(result.rawRowsByFile["file-a"]).toEqual([10, 20]);
    expect(result.scopedRowsByFile["file-a"]).toEqual([10, 20]);
  });

  it("menggunakan explicit SCOPED jika scope berisi row", () => {
    const result = getStudentFileMembership({
      currentFileKeys: ["file-a"],
      fileStudentMatches: { "file-a": createMatch([10, 20]) },
      fileStudentScopes: { "file-a": [10] },
    });

    expect(result.rawRowsByFile["file-a"]).toEqual([10, 20]);
    expect(result.scopedRowsByFile["file-a"]).toEqual([10]);
  });

  it("scope kosong tetap fallback ke RAW", () => {
    const result = getStudentFileMembership({
      currentFileKeys: ["file-a"],
      fileStudentMatches: { "file-a": createMatch([10, 20]) },
      fileStudentScopes: { "file-a": [] },
    });

    expect(result.rawRowsByFile["file-a"]).toEqual([10, 20]);
    expect(result.scopedRowsByFile["file-a"]).toEqual([10, 20]);
  });
});
