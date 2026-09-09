import { beforeEach, describe, expect, it, vi } from "vitest";

import { googleSheetStudentRepository } from "@/lib/sheets/google-sheet-student-repository";
import { mapRowToStudentRecord } from "@/lib/sheets/student-record-mapper";
import {
  getStudentDetailByRowIndex,
  getStudentRecordByRowIndex,
  getStudentSheetRows,
  updateStudentSheetDocuments,
} from "@/lib/sheets/student-sheet";

vi.mock("@/lib/sheets/student-record-mapper", () => ({ mapRowToStudentRecord: vi.fn() }));

vi.mock("@/lib/sheets/student-sheet", () => ({
  getStudentDetailByRowIndex: vi.fn(),
  getStudentRecordByRowIndex: vi.fn(),
  getStudentSheetRows: vi.fn(),
  updateStudentSheetDocuments: vi.fn(),
}));

describe("googleSheetStudentRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listStudents memetakan row Sheet dan membuang student tanpa nama", async () => {
    const rows = [{ rowNumber: 10 }, { rowNumber: 11 }];

    vi.mocked(getStudentSheetRows).mockResolvedValue(rows as never);

    vi.mocked(mapRowToStudentRecord)
      .mockReturnValueOnce({
        rowIndex: 10,
        nik: "3171000000000010",
        nama: "Adhibah",
        kelas: "1",
        rombel: "A",
        noKk: "",
        noAkta: "",
        kkComplete: false,
        aktaComplete: false,
      })
      .mockReturnValueOnce({
        rowIndex: 11,
        nik: "",
        nama: "",
        kelas: "",
        rombel: "",
        noKk: "",
        noAkta: "",
        kkComplete: false,
        aktaComplete: false,
      });

    const result = await googleSheetStudentRepository.listStudents();

    expect(getStudentSheetRows).toHaveBeenCalledOnce();
    expect(mapRowToStudentRecord).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0]?.rowIndex).toBe(10);
    expect(result[0]?.nama).toBe("Adhibah");
  });

  it("getStudentRecord meneruskan rowIndex ke Sheet implementation", async () => {
    const student = {
      rowIndex: 10,
      nik: "3171000000000010",
      nama: "Adhibah",
      kelas: "1",
      rombel: "A",
      noKk: "",
      noAkta: "",
      kkComplete: false,
      aktaComplete: false,
    };

    vi.mocked(getStudentRecordByRowIndex).mockResolvedValue(student);

    await expect(googleSheetStudentRepository.getStudentRecord(10)).resolves.toEqual(student);

    expect(getStudentRecordByRowIndex).toHaveBeenCalledWith(10);
  });

  it("getStudentDetail meneruskan rowIndex dan mempertahankan null", async () => {
    vi.mocked(getStudentDetailByRowIndex).mockResolvedValue(null);

    await expect(googleSheetStudentRepository.getStudentDetail(99)).resolves.toBeNull();

    expect(getStudentDetailByRowIndex).toHaveBeenCalledWith(99);
  });

  it("updateStudentDocuments meneruskan payload ke Sheet implementation", async () => {
    vi.mocked(updateStudentSheetDocuments).mockResolvedValue(true);

    const update = { rowIndex: 10, extractedData: null, aktaData: null, studentName: "Adhibah" };

    await expect(googleSheetStudentRepository.updateStudentDocuments(update)).resolves.toBe(true);

    expect(updateStudentSheetDocuments).toHaveBeenCalledWith(10, null, null, "Adhibah");
  });
});
