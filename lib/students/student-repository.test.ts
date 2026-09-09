import { describe, expect, it } from "vitest";

import type { StudentDocumentUpdate, StudentRepository } from "@/lib/students/student-repository";

import type { StudentRecord } from "@/types/student";
import type { StudentDetail } from "@/types/student-detail";

interface SimulatedSupabaseStudent {
  id: string;
  rowIndex: number;
  nik: string;
  nama: string;
  kelas: string;
  rombel: string;
  noKk: string;
  noAkta: string;
  kkComplete: boolean;
  aktaComplete: boolean;
  detail: StudentDetail;
}

function toStudentRecord(student: SimulatedSupabaseStudent): StudentRecord {
  return {
    rowIndex: student.rowIndex,
    nik: student.nik,
    nama: student.nama,
    kelas: student.kelas,
    rombel: student.rombel,
    noKk: student.noKk,
    noAkta: student.noAkta,
    kkComplete: student.kkComplete,
    aktaComplete: student.aktaComplete,
  };
}

function createSimulatedSupabaseRepository(
  initialStudents: SimulatedSupabaseStudent[],
): StudentRepository {
  const students = new Map(initialStudents.map((student) => [student.rowIndex, student]));

  return {
    async listStudents() {
      return [...students.values()].map(toStudentRecord);
    },

    async getStudentRecord(rowIndex) {
      const student = students.get(rowIndex);

      return student ? toStudentRecord(student) : null;
    },

    async getStudentDetail(rowIndex) {
      return students.get(rowIndex)?.detail ?? null;
    },

    async updateStudentDocuments(update: StudentDocumentUpdate) {
      return students.has(update.rowIndex);
    },
  };
}

describe("StudentRepository contract", () => {
  const createRepository = () =>
    createSimulatedSupabaseRepository([
      {
        id: "student-uuid-001",
        rowIndex: 10,
        nik: "3171000000000010",
        nama: "Adhibah",
        kelas: "1",
        rombel: "A",
        noKk: "",
        noAkta: "",
        kkComplete: false,
        aktaComplete: false,
        detail: { kk: null, akta: null },
      },
    ]);

  it("listStudents mengembalikan StudentRecord tanpa metadata persistence", async () => {
    const repository = createRepository();

    const students = await repository.listStudents();

    expect(students).toEqual([
      {
        rowIndex: 10,
        nik: "3171000000000010",
        nama: "Adhibah",
        kelas: "1",
        rombel: "A",
        noKk: "",
        noAkta: "",
        kkComplete: false,
        aktaComplete: false,
      },
    ]);

    expect(students[0]).not.toHaveProperty("id");
    expect(students[0]).not.toHaveProperty("detail");
  });

  it("getStudentRecord menggunakan application identifier yang tersedia sekarang", async () => {
    const repository = createRepository();

    await expect(repository.getStudentRecord(10)).resolves.toMatchObject({
      rowIndex: 10,
      nama: "Adhibah",
    });

    await expect(repository.getStudentRecord(99)).resolves.toBeNull();
  });

  it("getStudentDetail tidak bergantung pada bentuk storage", async () => {
    const repository = createRepository();

    await expect(repository.getStudentDetail(10)).resolves.toEqual({ kk: null, akta: null });
  });

  it("updateStudentDocuments mengikuti contract repository", async () => {
    const repository = createRepository();

    await expect(
      repository.updateStudentDocuments({
        rowIndex: 10,
        extractedData: null,
        aktaData: null,
        studentName: "Adhibah",
      }),
    ).resolves.toBe(true);

    await expect(
      repository.updateStudentDocuments({
        rowIndex: 99,
        extractedData: null,
        aktaData: null,
        studentName: "Tidak Ada",
      }),
    ).resolves.toBe(false);
  });
});
