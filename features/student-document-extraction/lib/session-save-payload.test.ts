import { describe, expect, it } from "vitest";
import { buildSessionSavePayload } from "./session-save-payload";
import type { AktaResult } from "@/types/akta";
import type { FileExtractionState } from "@/types/extraction";
import type { KkResult } from "@/types/kk";
import type { StudentRecord } from "@/types/student";

function createStudent(
  overrides: Partial<StudentRecord> = {}
): StudentRecord {
  return {
    rowIndex: 10,
    nik: "1234567890123456",
    nama: "Budi Santoso",
    kelas: "1",
    rombel: "A",
    noKk: "",
    noAkta: "",
    kkComplete: false,
    aktaComplete: false,
    ...overrides,
  };
}

function createKk(): KkResult {
  return {
    no_kk: "1111222233334444",
    anggota_keluarga: [],
  } as unknown as KkResult;
}

function createAkta(): AktaResult {
  return {
    no_akta_kelahiran: "AKTA-001",
    nama_anak: "Budi Santoso",
  } as AktaResult;
}

function createExtraction(
  overrides: Partial<FileExtractionState> = {}
): FileExtractionState {
  return {
    type: "unknown",
    kk: null,
    akta: null,
    modelUsedKk: "",
    modelUsedAkta: "",
    ...overrides,
  };
}

describe("buildSessionSavePayload", () => {
  it("mengembalikan null jika student tidak termasuk session", () => {
    const result = buildSessionSavePayload({
      student: createStudent(),
      sessionStudentRowIndexes: [20],
      currentFileKeys: ["file-a"],
      scopedRowsByFile: {
        "file-a": [10],
      },
      fileExtractions: {
        "file-a": createExtraction({
          type: "kk",
          kk: createKk(),
        }),
      },
    });

    expect(result).toBeNull();
  });

  it("mengembalikan null jika student tidak termasuk SCOPED file", () => {
    const result = buildSessionSavePayload({
      student: createStudent({
        rowIndex: 20,
      }),
      sessionStudentRowIndexes: [20],
      currentFileKeys: ["shared-kk"],
      scopedRowsByFile: {
        "shared-kk": [10],
      },
      fileExtractions: {
        "shared-kk": createExtraction({
          type: "kk",
          kk: createKk(),
        }),
      },
    });

    expect(result).toBeNull();
  });

  it("membuat payload KK dari file yang termasuk SCOPED student", () => {
    const kk = createKk();

    const result = buildSessionSavePayload({
      student: createStudent(),
      sessionStudentRowIndexes: [10],
      currentFileKeys: ["file-kk"],
      scopedRowsByFile: {
        "file-kk": [10],
      },
      fileExtractions: {
        "file-kk": createExtraction({
          type: "kk",
          kk,
        }),
      },
    });

    expect(result).toEqual({
      rowIndex: 10,
      extractedData: kk,
      aktaData: null,
      fileName: "Budi Santoso_KK.pdf",
    });
  });

  it("tidak memasukkan KK jika data KK student sudah lengkap", () => {
    const akta = createAkta();

    const result = buildSessionSavePayload({
      student: createStudent({
        kkComplete: true,
      }),
      sessionStudentRowIndexes: [10],
      currentFileKeys: ["file-both"],
      scopedRowsByFile: {
        "file-both": [10],
      },
      fileExtractions: {
        "file-both": createExtraction({
          type: "both",
          kk: createKk(),
          akta,
        }),
      },
    });

    expect(result).toEqual({
      rowIndex: 10,
      extractedData: null,
      aktaData: akta,
      fileName: "Budi Santoso_KK.pdf",
    });
  });

  it("tidak memasukkan Akta jika data Akta student sudah lengkap", () => {
    const kk = createKk();

    const result = buildSessionSavePayload({
      student: createStudent({
        aktaComplete: true,
      }),
      sessionStudentRowIndexes: [10],
      currentFileKeys: ["file-both"],
      scopedRowsByFile: {
        "file-both": [10],
      },
      fileExtractions: {
        "file-both": createExtraction({
          type: "both",
          kk,
          akta: createAkta(),
        }),
      },
    });

    expect(result).toEqual({
      rowIndex: 10,
      extractedData: kk,
      aktaData: null,
      fileName: "Budi Santoso_KK.pdf",
    });
  });

  it("mengembalikan null jika KK dan Akta sudah lengkap", () => {
    const result = buildSessionSavePayload({
      student: createStudent({
        kkComplete: true,
        aktaComplete: true,
      }),
      sessionStudentRowIndexes: [10],
      currentFileKeys: ["file-both"],
      scopedRowsByFile: {
        "file-both": [10],
      },
      fileExtractions: {
        "file-both": createExtraction({
          type: "both",
          kk: createKk(),
          akta: createAkta(),
        }),
      },
    });

    expect(result).toBeNull();
  });

  it("mengembalikan null jika scoped file tidak memiliki extraction", () => {
    const result = buildSessionSavePayload({
      student: createStudent(),
      sessionStudentRowIndexes: [10],
      currentFileKeys: ["file-a"],
      scopedRowsByFile: {
        "file-a": [10],
      },
      fileExtractions: {},
    });

    expect(result).toBeNull();
  });
});