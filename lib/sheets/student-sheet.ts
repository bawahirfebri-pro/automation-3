import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import type { GoogleSpreadsheetRow } from "google-spreadsheet";

export function getSheetValue(
  row: GoogleSpreadsheetRow,
  header: string
): string {
  return row.get(header)?.toString().trim() || "";
}

async function getStudentSheet() {
  const serviceAccountEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const privateKey =
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const spreadsheetId =
    process.env.GOOGLE_SHEET_ID;

  if (
    !serviceAccountEmail ||
    !privateKey ||
    !spreadsheetId
  ) {
    throw new Error(
      "Konfigurasi Google Sheet belum lengkap."
    );
  }

  const serviceAccountAuth = new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  const doc = new GoogleSpreadsheet(
    spreadsheetId,
    serviceAccountAuth
  );

  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  if (!sheet) {
    throw new Error(
      "Sheet tujuan tidak ditemukan."
    );
  }

  return sheet;
}

export async function getStudentSheetRow(
  rowIndex: number
): Promise<GoogleSpreadsheetRow | null> {
  const sheet = await getStudentSheet();
  const rows = await sheet.getRows();

  return (
    rows.find(
      (row) => row.rowNumber === rowIndex
    ) ?? null
  );
}