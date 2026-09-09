import { mapRowToStudentRecord } from "@/lib/sheets/student-record-mapper";
import {
  getStudentDetailByRowIndex,
  getStudentRecordByRowIndex,
  getStudentSheetRows,
  updateStudentSheetDocuments,
} from "@/lib/sheets/student-sheet";
import type { StudentDocumentUpdate, StudentRepository } from "@/lib/students/student-repository";

export const googleSheetStudentRepository: StudentRepository = {
  async listStudents() {
    const rows = await getStudentSheetRows();

    return rows.map(mapRowToStudentRecord).filter((student) => student.nama !== "");
  },

  getStudentRecord(rowIndex) {
    return getStudentRecordByRowIndex(rowIndex);
  },

  getStudentDetail(rowIndex) {
    return getStudentDetailByRowIndex(rowIndex);
  },

  updateStudentDocuments(update: StudentDocumentUpdate) {
    return updateStudentSheetDocuments(
      update.rowIndex,
      update.extractedData,
      update.aktaData,
      update.studentName,
    );
  },
};
