import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudentRecord } from "@/types/student";

const { getNamedStudentRowMock } = vi.hoisted(() => ({ getNamedStudentRowMock: vi.fn() }));

vi.mock("@/lib/students/file-student-matcher", () => ({
  getNamedStudentRow: getNamedStudentRowMock,
}));

import { getUploadFastPathState } from "./get-upload-fast-path-state";

function createFile(name: string): File {
  return new File(["x"], name, { type: "application/pdf", lastModified: 100 });
}

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

describe("getUploadFastPathState", () => {
  beforeEach(() => {
    getNamedStudentRowMock.mockReset();
  });

  it("mengizinkan fast path jika existing session ready dan seluruh incoming filename resolve", () => {
    const fileA = createFile("Budi_KK.pdf");
    const fileB = createFile("Siti_Akta.pdf");

    const students = [createStudent(10, "Budi Santoso"), createStudent(20, "Siti Aminah")];

    getNamedStudentRowMock.mockReturnValueOnce(10).mockReturnValueOnce(20);

    const result = getUploadFastPathState({
      selectedFiles: [fileA, fileB],
      students,
      currentFileKeys: ["existing"],
      fileExtractions: { existing: {} },
      fileResolutionComplete: { existing: true },
      aiMatchingFileKeys: [],
    });

    expect(result.canUseFilenameFastPath).toBe(true);
    expect(result.incomingRows).toEqual([10, 20]);
  });

  it("menghapus duplicate incoming row pada hasil fast path", () => {
    const kk = createFile("Budi_KK.pdf");
    const akta = createFile("Budi_Akta.pdf");

    const students = [createStudent(10, "Budi Santoso")];

    getNamedStudentRowMock.mockReturnValueOnce(10).mockReturnValueOnce(10);

    const result = getUploadFastPathState({
      selectedFiles: [kk, akta],
      students,
      currentFileKeys: [],
      fileExtractions: {},
      fileResolutionComplete: {},
      aiMatchingFileKeys: [],
    });

    expect(result.canUseFilenameFastPath).toBe(true);
    expect(result.incomingRows).toEqual([10]);
  });

  it("menolak fast path jika salah satu incoming filename tidak resolve", () => {
    const fileA = createFile("Budi_KK.pdf");
    const fileB = createFile("tidak-dikenal.pdf");

    getNamedStudentRowMock.mockReturnValueOnce(10).mockReturnValueOnce(null);

    const result = getUploadFastPathState({
      selectedFiles: [fileA, fileB],
      students: [createStudent(10, "Budi Santoso")],
      currentFileKeys: [],
      fileExtractions: {},
      fileResolutionComplete: {},
      aiMatchingFileKeys: [],
    });

    expect(result.canUseFilenameFastPath).toBe(false);
    expect(result.incomingRows).toEqual([]);
  });

  it("menolak fast path jika existing file belum memiliki extraction", () => {
    getNamedStudentRowMock.mockReturnValue(10);

    const result = getUploadFastPathState({
      selectedFiles: [createFile("Budi_KK.pdf")],
      students: [createStudent(10, "Budi Santoso")],
      currentFileKeys: ["existing"],
      fileExtractions: {},
      fileResolutionComplete: { existing: true },
      aiMatchingFileKeys: [],
    });

    expect(result.canUseFilenameFastPath).toBe(false);
    expect(result.incomingRows).toEqual([]);
  });

  it("menolak fast path jika existing resolution belum complete", () => {
    getNamedStudentRowMock.mockReturnValue(10);

    const result = getUploadFastPathState({
      selectedFiles: [createFile("Budi_KK.pdf")],
      students: [createStudent(10, "Budi Santoso")],
      currentFileKeys: ["existing"],
      fileExtractions: { existing: {} },
      fileResolutionComplete: { existing: false },
      aiMatchingFileKeys: [],
    });

    expect(result.canUseFilenameFastPath).toBe(false);
  });

  it("menolak fast path jika existing file masih AI matching", () => {
    getNamedStudentRowMock.mockReturnValue(10);

    const result = getUploadFastPathState({
      selectedFiles: [createFile("Budi_KK.pdf")],
      students: [createStudent(10, "Budi Santoso")],
      currentFileKeys: ["existing"],
      fileExtractions: { existing: {} },
      fileResolutionComplete: { existing: true },
      aiMatchingFileKeys: ["existing"],
    });

    expect(result.canUseFilenameFastPath).toBe(false);
  });

  it("session kosong dianggap existing-ready", () => {
    getNamedStudentRowMock.mockReturnValue(10);

    const result = getUploadFastPathState({
      selectedFiles: [createFile("Budi_KK.pdf")],
      students: [createStudent(10, "Budi Santoso")],
      currentFileKeys: [],
      fileExtractions: {},
      fileResolutionComplete: {},
      aiMatchingFileKeys: [],
    });

    expect(result.canUseFilenameFastPath).toBe(true);
    expect(result.incomingRows).toEqual([10]);
  });
});
