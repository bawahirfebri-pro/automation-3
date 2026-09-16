import { describe, expect, it } from "vitest";

import { createFileStudentMatch } from "@/lib/students/file-student-matcher";

import type { StudentRecord } from "@/types/student";

import { applyAiResolvedStudentMatch, isResolutionRowValid } from "./student-resolution-utils";

function createStudent(rowIndex: number, nama: string): StudentRecord {
  return {
    rowIndex,
    nik: `${rowIndex}`,
    nama,
    kelas: "6",
    rombel: "A",
    noKk: "",
    noAkta: "",
    kkComplete: false,
    aktaComplete: false,
  };
}

describe("isResolutionRowValid", () => {
  it("valid jika row merupakan candidate dan masih ada di master student", () => {
    expect(isResolutionRowValid(10, [{ rowIndex: 10 }], [createStudent(10, "Budi")])).toBe(true);
  });

  it("invalid jika row bukan candidate task", () => {
    expect(isResolutionRowValid(20, [{ rowIndex: 10 }], [createStudent(20, "Siti")])).toBe(false);
  });

  it("invalid jika candidate sudah tidak ada di master student", () => {
    expect(isResolutionRowValid(10, [{ rowIndex: 10 }], [])).toBe(false);
  });
});

describe("applyAiResolvedStudentMatch", () => {
  it("menggabungkan base rows, previous rows, dan AI row", () => {
    const result = applyAiResolvedStudentMatch({
      previous: { file: createFileStudentMatch([20], "exact") },
      fileKey: "file",
      baseRows: [10],
      rowIndex: 30,
    });

    expect(result.collision).toBe(false);

    expect(result.next.file.rowIndexes).toEqual([10, 20, 30]);

    expect(result.next.file.source).toBe("ai");
  });

  it("mempertahankan source manual jika file sebelumnya sudah manual", () => {
    const result = applyAiResolvedStudentMatch({
      previous: { file: createFileStudentMatch([10], "manual") },
      fileKey: "file",
      baseRows: [],
      rowIndex: 20,
    });

    expect(result.collision).toBe(false);

    expect(result.next.file.source).toBe("manual");

    expect(result.next.file.rowIndexes).toEqual([10, 20]);
  });

  it("menandai collision dan tidak mengubah state jika row sudah diklaim", () => {
    const previous = { file: createFileStudentMatch([10], "ai" as const) };

    const result = applyAiResolvedStudentMatch({
      previous,
      fileKey: "file",
      baseRows: [],
      rowIndex: 10,
    });

    expect(result.collision).toBe(true);
    expect(result.next).toBe(previous);
  });
});
