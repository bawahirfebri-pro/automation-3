import { describe, expect, it } from "vitest";

import type { AktaResult } from "@/types/akta";
import type { FileExtractionState } from "@/types/extraction";
import type { KkResult } from "@/types/kk";
import type { StudentRecord } from "@/types/student";
import type { StudentDetailBaseline } from "@/types/student-detail";

import { getSessionDocumentState } from "./session-document-state";

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

function createKk(): KkResult {
  return { no_kk: "1111222233334444", anggota_keluarga: [] } as unknown as KkResult;
}

function createAkta(nama = "Budi Santoso"): AktaResult {
  return { no_akta_kelahiran: "AKTA-001", nama_anak: nama } as AktaResult;
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

describe("getSessionDocumentState", () => {
  it("hanya mengambil extraction dari file yang termasuk SCOPED student aktif", () => {
    const studentA = createStudent(10, "Budi Santoso");
    const studentB = createStudent(20, "Siti Aminah");
    const kk = createKk();
    const aktaB = createAkta("Siti Aminah");

    const result = getSessionDocumentState({
      currentFileKeys: ["shared-kk", "akta-b"],
      scopedRowsByFile: { "shared-kk": [10, 20], "akta-b": [20] },
      fileExtractions: {
        "shared-kk": createExtraction({ type: "kk", kk }),
        "akta-b": createExtraction({ type: "akta", akta: aktaB }),
      },
      sessionStudents: [studentA, studentB],
      primarySessionStudent: studentA,
      selectedStudentRow: 10,
      filesLength: 2,
      studentDetailBaseline: null,
    });

    expect(result.primaryStudentFileKeys).toEqual(["shared-kk"]);
    expect(result.sessionKkExtraction?.kk).toBe(kk);
    expect(result.sessionAktaExtraction).toBeNull();
  });

  it("tidak membocorkan extraction session ke student yang dipilih di luar session", () => {
    const sessionStudent = createStudent(10, "Budi Santoso");
    const outsideStudent = createStudent(20, "Siti Aminah");

    const result = getSessionDocumentState({
      currentFileKeys: ["akta-a"],
      scopedRowsByFile: { "akta-a": [10] },
      fileExtractions: {
        "akta-a": createExtraction({ type: "akta", akta: createAkta("Budi Santoso") }),
      },
      sessionStudents: [sessionStudent],
      primarySessionStudent: outsideStudent,
      selectedStudentRow: 20,
      filesLength: 1,
      studentDetailBaseline: null,
    });

    expect(result.primaryStudentFileKeys).toEqual([]);
    expect(result.sessionKkExtraction).toBeNull();
    expect(result.sessionAktaExtraction).toBeNull();
    expect(result.unregisteredExtraction).toBeNull();
  });

  it("menampilkan unregistered extraction hanya jika tidak ada session maupun primary student", () => {
    const extraction = createExtraction({ type: "akta", akta: createAkta() });

    const result = getSessionDocumentState({
      currentFileKeys: ["unknown-file"],
      scopedRowsByFile: { "unknown-file": [] },
      fileExtractions: { "unknown-file": extraction },
      sessionStudents: [],
      primarySessionStudent: null,
      selectedStudentRow: null,
      filesLength: 1,
      studentDetailBaseline: null,
    });

    expect(result.unregisteredExtraction).toBe(extraction);
  });

  it("hanya memakai baseline jika baseline milik student aktif", () => {
    const student = createStudent(20, "Siti Aminah");

    const baseline = {
      rowIndex: 10,
      kk: createKk(),
      akta: null,
      modelUsedKk: "",
      modelUsedAkta: "",
    } as StudentDetailBaseline;

    const result = getSessionDocumentState({
      currentFileKeys: [],
      scopedRowsByFile: {},
      fileExtractions: {},
      sessionStudents: [],
      primarySessionStudent: null,
      selectedStudentRow: student.rowIndex,
      filesLength: 0,
      studentDetailBaseline: baseline,
    });

    expect(result.activeStudentBaseline).toBeNull();
  });
});
