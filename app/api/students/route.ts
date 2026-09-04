import { NextResponse } from "next/server";

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

import { applyStudentCompleteness } from "@/lib/student-completeness";

import type { StudentRecord } from "@/types/student";

export async function GET() {
  try {
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

    const doc = new GoogleSpreadsheet(
      spreadsheetId,
      serviceAccountAuth
    );

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];

    if (!sheet) {
      throw new Error("Sheet tujuan tidak ditemukan.");
    }

    const rows = await sheet.getRows();

    const students: StudentRecord[] = rows
      .map((row) => {
        const student = {
  rowIndex: row.rowNumber,
  nik:
    row
      .get("NIK")
      ?.toString()
      .trim() || "",
  nama:
    row
      .get("Nama")
      ?.toString()
      .trim() || "",
  kelas:
    row
      .get("Kelas")
      ?.toString()
      .trim() || "",
  rombel:
    row
      .get("Rombel")
      ?.toString()
      .trim() || "",
  noKk:
    row
      .get("No. Kartu Keluarga")
      ?.toString()
      .trim() || "",
  noAkta:
    row
      .get("No. Akta Kelahiran")
      ?.toString()
      .trim() || "",
};

        return applyStudentCompleteness(student);
      })
      .filter((student) => student.nama !== "");

    return NextResponse.json({
      success: true,
      data: students,
    });
  } catch (error: unknown) {
    console.error("[API /students]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal membaca daftar murid dari Google Sheet.",
      },
      { status: 500 }
    );
  }
}