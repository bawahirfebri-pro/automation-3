import { describe, expect, it } from "vitest";

import type { FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

import { getFilenameMatchIssues } from "./get-filename-match-issues";

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

function createAktaExtraction(namaAnak: string): FileExtractionState {
  return {
    type: "akta",
    kk: null,
    akta: {
      no_akta_kelahiran: "",
      nama_anak: namaAnak,
      anak_ke: "",
      tempat_lahir: "",
      tanggal_lahir: "",
      nama_ayah: "",
      nama_ibu: "",
    },
    modelUsedKk: "",
    modelUsedAkta: "",
  };
}

describe("getFilenameMatchIssues", () => {
  it("tidak membuat issue untuk exact student match", () => {
    const result = getFilenameMatchIssues({
      currentFileKeys: ["akta"],
      processedFileKeys: ["akta"],
      fileExtractions: { akta: createAktaExtraction("BUDI SANTOSO") },
      students: [createStudent(10, "Budi Santoso")],
    });

    expect(result).toEqual({});
  });

  it("menerima satu prefix match jika exact tidak ditemukan", () => {
    const result = getFilenameMatchIssues({
      currentFileKeys: ["akta"],
      processedFileKeys: ["akta"],
      fileExtractions: { akta: createAktaExtraction("Budi") },
      students: [createStudent(10, "Budi Santoso")],
    });

    expect(result).toEqual({});
  });

  it("membuat issue jika nama tidak ditemukan", () => {
    const result = getFilenameMatchIssues({
      currentFileKeys: ["akta"],
      processedFileKeys: ["akta"],
      fileExtractions: { akta: createAktaExtraction("ANAK TIDAK TERDAFTAR") },
      students: [createStudent(10, "Budi Santoso")],
    });

    expect(result).toEqual({ akta: { status: "not-found", detectedName: "Anak Tidak Terdaftar" } });
  });

  it("membuat issue jika prefix cocok dengan lebih dari satu student", () => {
    const result = getFilenameMatchIssues({
      currentFileKeys: ["akta"],
      processedFileKeys: ["akta"],
      fileExtractions: { akta: createAktaExtraction("Budi") },
      students: [createStudent(10, "Budi Santoso"), createStudent(20, "Budi Saputra")],
    });

    expect(result.akta).toEqual({ status: "not-found", detectedName: "Budi" });
  });

  it("mengabaikan file yang belum processed", () => {
    const result = getFilenameMatchIssues({
      currentFileKeys: ["akta"],
      processedFileKeys: [],
      fileExtractions: { akta: createAktaExtraction("Tidak Dikenal") },
      students: [],
    });

    expect(result).toEqual({});
  });

  it("mengabaikan extraction tanpa Akta", () => {
    const extraction: FileExtractionState = {
      type: "kk",
      kk: {} as never,
      akta: null,
      modelUsedKk: "",
      modelUsedAkta: "",
    };

    const result = getFilenameMatchIssues({
      currentFileKeys: ["kk"],
      processedFileKeys: ["kk"],
      fileExtractions: { kk: extraction },
      students: [],
    });

    expect(result).toEqual({});
  });
});
