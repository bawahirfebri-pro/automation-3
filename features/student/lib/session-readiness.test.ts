import { describe, expect, it } from "vitest";

import type { FileStudentMatch } from "@/lib/students/file-student-matcher";

import type { FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

import { getSessionReadiness, type SessionReadinessParams } from "./session-readiness";

function createStudent(rowIndex: number, nama: string): StudentRecord {
  return {
    rowIndex,
    nik: `${rowIndex}`.padStart(16, "0"),
    nama,
    kelas: "1",
    rombel: "A",
    noKk: "",
    noAkta: "",
    kkComplete: false,
    aktaComplete: false,
  };
}

function createMatch(rowIndexes: number[]): FileStudentMatch {
  return { rowIndexes } as FileStudentMatch;
}

function createExtraction(overrides: Partial<FileExtractionState> = {}): FileExtractionState {
  return {
    type: "unknown",
    kk: null,
    akta: null,
    modelUsedKk: "",
    modelUsedAkta: "",
    ...overrides,
  };
}

function createBaseParams(overrides: Partial<SessionReadinessParams> = {}): SessionReadinessParams {
  return {
    filesLength: 1,
    currentFileKeys: ["file-a"],
    scopedRowsByFile: { "file-a": [10] },
    fileExtractions: { "file-a": createExtraction({ type: "akta", akta: {} as never }) },
    fileStudentMatches: { "file-a": createMatch([10]) },
    fileResolutionComplete: { "file-a": true },
    failedFileKeys: [],
    students: [createStudent(10, "Budi Santoso"), createStudent(20, "Siti Aminah")],
    pendingUploadFileKeys: [],
    isExtracting: false,
    isAiMatching: false,
    ...overrides,
  };
}

describe("getSessionReadiness", () => {
  it("menandai session ready jika seluruh kondisi terpenuhi", () => {
    const result = getSessionReadiness(createBaseParams());

    expect(result.sessionReady).toBe(true);
    expect(result.sessionConflict).toBe("");
    expect(result.duplicateDocumentMsg).toBe("");
    expect(result.missingExtractionFileKeys).toEqual([]);
    expect(result.unresolvedFileKeys).toEqual([]);
    expect(result.unresolvedResolutionFileKeys).toEqual([]);
  });

  it("tidak ready saat masih extracting", () => {
    const result = getSessionReadiness(createBaseParams({ isExtracting: true }));

    expect(result.sessionReady).toBe(false);
  });

  it("tidak ready saat masih AI matching", () => {
    const result = getSessionReadiness(createBaseParams({ isAiMatching: true }));

    expect(result.sessionReady).toBe(false);
  });

  it("tidak ready saat masih ada pending upload", () => {
    const result = getSessionReadiness(createBaseParams({ pendingUploadFileKeys: ["file-a"] }));

    expect(result.sessionReady).toBe(false);
  });

  it("mendeteksi missing extraction", () => {
    const result = getSessionReadiness(createBaseParams({ fileExtractions: {} }));

    expect(result.missingExtractionFileKeys).toEqual(["file-a"]);
    expect(result.sessionReady).toBe(false);
  });

  it("mendeteksi unresolved file jika extraction ada tetapi belum memiliki student match", () => {
    const result = getSessionReadiness(
      createBaseParams({ fileStudentMatches: { "file-a": createMatch([]) } }),
    );

    expect(result.unresolvedFileKeys).toEqual(["file-a"]);
    expect(result.sessionReady).toBe(false);
  });

  it("mendeteksi resolution yang belum complete", () => {
    const result = getSessionReadiness(
      createBaseParams({ fileResolutionComplete: { "file-a": false } }),
    );

    expect(result.unresolvedResolutionFileKeys).toEqual(["file-a"]);

    expect(result.sessionReady).toBe(false);
  });

  it("mendeteksi Akta milik siswa di luar KK", () => {
    const result = getSessionReadiness(
      createBaseParams({
        filesLength: 2,
        currentFileKeys: ["file-kk", "file-akta"],
        scopedRowsByFile: { "file-kk": [10], "file-akta": [20] },
        fileExtractions: {
          "file-kk": createExtraction({ type: "kk", kk: {} as never }),
          "file-akta": createExtraction({ type: "akta", akta: {} as never }),
        },
        fileStudentMatches: { "file-kk": createMatch([10]), "file-akta": createMatch([20]) },
        fileResolutionComplete: { "file-kk": true, "file-akta": true },
      }),
    );

    expect(result.sessionConflict).toContain("Siti Aminah");
    expect(result.sessionReady).toBe(false);
  });

  it("mendeteksi multi-student session tanpa KK sebagai conflict", () => {
    const result = getSessionReadiness(
      createBaseParams({
        filesLength: 2,
        currentFileKeys: ["akta-a", "akta-b"],
        scopedRowsByFile: { "akta-a": [10], "akta-b": [20] },
        fileExtractions: {
          "akta-a": createExtraction({ type: "akta", akta: {} as never }),
          "akta-b": createExtraction({ type: "akta", akta: {} as never }),
        },
        fileStudentMatches: { "akta-a": createMatch([10]), "akta-b": createMatch([20]) },
        fileResolutionComplete: { "akta-a": true, "akta-b": true },
      }),
    );

    expect(result.sessionConflict).toContain("Budi Santoso");
    expect(result.sessionConflict).toContain("Siti Aminah");
    expect(result.sessionReady).toBe(false);
  });

  it("mendeteksi duplicate KK untuk student yang sama", () => {
    const result = getSessionReadiness(
      createBaseParams({
        filesLength: 2,
        currentFileKeys: ["kk-a", "kk-b"],
        scopedRowsByFile: { "kk-a": [10], "kk-b": [10] },
        fileExtractions: {
          "kk-a": createExtraction({ type: "kk", kk: {} as never }),
          "kk-b": createExtraction({ type: "kk", kk: {} as never }),
        },
        fileStudentMatches: { "kk-a": createMatch([10]), "kk-b": createMatch([10]) },
        fileResolutionComplete: { "kk-a": true, "kk-b": true },
      }),
    );

    expect(result.duplicateDocumentMsg).toContain("Budi Santoso");
    expect(result.duplicateDocumentMsg).toContain("KK");
    expect(result.sessionReady).toBe(false);
  });

  it("tidak ready jika tidak ada session student", () => {
    const result = getSessionReadiness(createBaseParams({ scopedRowsByFile: { "file-a": [] } }));

    expect(result.sessionStudents).toEqual([]);
    expect(result.sessionReady).toBe(false);
  });
});
