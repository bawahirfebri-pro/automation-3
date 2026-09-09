import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { StudentRecord } from "@/types/student";
import type { StudentDetail } from "@/types/student-detail";

export interface StudentDocumentUpdate {
  rowIndex: number;
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  studentName: string;
}

export interface StudentRepository {
  listStudents(): Promise<StudentRecord[]>;
  getStudentRecord(rowIndex: number): Promise<StudentRecord | null>;
  getStudentDetail(rowIndex: number): Promise<StudentDetail | null>;
  updateStudentDocuments(update: StudentDocumentUpdate): Promise<boolean>;
}
