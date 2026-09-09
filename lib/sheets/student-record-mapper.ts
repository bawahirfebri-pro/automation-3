import type { GoogleSpreadsheetRow } from "google-spreadsheet";

import { applyStudentCompleteness } from "@/lib/students/student-completeness";

import type { StudentRecord } from "@/types/student";

export function mapRowToStudentRecord(row: GoogleSpreadsheetRow): StudentRecord {
  return applyStudentCompleteness({
    rowIndex: row.rowNumber,
    nik: row.get("NIK")?.toString().trim() || "",
    nama: row.get("Nama")?.toString().trim() || "",
    kelas: row.get("Kelas")?.toString().trim() || "",
    rombel: row.get("Rombel")?.toString().trim() || "",
    noKk: row.get("No. Kartu Keluarga")?.toString().trim() || "",
    noAkta: row.get("No. Akta Kelahiran")?.toString().trim() || "",
  });
}
