import { JWT } from "google-auth-library";
import type { GoogleSpreadsheetRow } from "google-spreadsheet";
import { GoogleSpreadsheet } from "google-spreadsheet";

import { mapDataToRow } from "@/lib/sheets/sheet-mapper";
import { mapRowToStudentDetail } from "@/lib/sheets/student-detail-mapper";
import { mapRowToStudentRecord } from "@/lib/sheets/student-record-mapper";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { StudentRecord } from "@/types/student";
import type { StudentDetail } from "@/types/student-detail";

export function getSheetValue(row: GoogleSpreadsheetRow, header: string): string {
  return row.get(header)?.toString().trim() || "";
}

async function getStudentSheet() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
    throw new Error("Konfigurasi Google Sheet belum lengkap.");
  }

  const serviceAccountAuth = new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);

  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  if (!sheet) {
    throw new Error("Sheet tujuan tidak ditemukan.");
  }

  return sheet;
}

export async function getStudentSheetRow(rowIndex: number): Promise<GoogleSpreadsheetRow | null> {
  const sheet = await getStudentSheet();
  const rows = await sheet.getRows();

  return rows.find((row) => row.rowNumber === rowIndex) ?? null;
}

export async function getStudentSheetRows(): Promise<GoogleSpreadsheetRow[]> {
  const sheet = await getStudentSheet();

  return sheet.getRows();
}

export async function updateStudentSheetDocuments(
  rowIndex: number,
  extractedData: KkResult | null,
  aktaData: AktaResult | null,
  studentName: string,
): Promise<boolean> {
  const row = await getStudentSheetRow(rowIndex);

  if (!row) return false;

  mapDataToRow(row, extractedData, aktaData, studentName);

  await row.save();

  return true;
}

export async function getStudentRecordByRowIndex(rowIndex: number): Promise<StudentRecord | null> {
  const row = await getStudentSheetRow(rowIndex);

  if (!row) return null;

  return mapRowToStudentRecord(row);
}

export async function getStudentDetailByRowIndex(rowIndex: number): Promise<StudentDetail | null> {
  const row = await getStudentSheetRow(rowIndex);

  if (!row) return null;

  return mapRowToStudentDetail(row);
}
