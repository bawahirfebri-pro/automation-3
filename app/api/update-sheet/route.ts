import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

import { formatTeksResmi } from "@/lib/text-formatter";
import { mapDataToRow } from "@/lib/sheet-mapper";
import { validateExtractedKk } from "@/lib/validator";
import { extractStudentNameFromFilename } from "@/lib/document-name";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

interface UpdateSheetRequest {
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  fileName: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UpdateSheetRequest;
    const { extractedData, aktaData, fileName } = body;

    if (!extractedData && !aktaData) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada data KK atau Akta untuk disinkronkan.",
        },
        { status: 400 }
      );
    }

    if (extractedData) {
      const validationError = validateExtractedKk(extractedData);

      if (validationError) {
        return NextResponse.json(
          {
            success: false,
            message: `Ditolak oleh Server: ${validationError}`,
          },
          { status: 400 }
        );
      }
    }

    const serviceAccountEmail =
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    const privateKey =
      process.env.GOOGLE_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      );

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

    const rows = await sheet.getRows();

    let namaSiswaTarget = fileName
      ? extractStudentNameFromFilename(fileName)
      : "";

    const listAnggota =
      extractedData?.anggota_keluarga ?? [];

    if (!namaSiswaTarget && listAnggota.length > 0) {
      const anak = listAnggota.find((anggota) =>
        anggota.status_hubungan_dalam_keluarga
          .toLowerCase()
          .includes("anak")
      );

      namaSiswaTarget = (
        anak?.nama_lengkap ||
        listAnggota[0]?.nama_lengkap ||
        ""
      )
        .trim()
        .toLowerCase();
    }

    if (
      !namaSiswaTarget &&
      aktaData?.nama_anak
    ) {
      namaSiswaTarget =
        aktaData.nama_anak
          .trim()
          .toLowerCase();
    }

    if (!namaSiswaTarget) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nama siswa tidak dapat diidentifikasi.",
        },
        { status: 400 }
      );
    }

    const targetRow = rows.find(
      (row) =>
        row
          .get("Nama")
          ?.toString()
          .trim()
          .toLowerCase() ===
        namaSiswaTarget
    );

    if (!targetRow) {
      return NextResponse.json(
        {
          success: false,
          message: `Siswa dengan nama ("${formatTeksResmi(
            namaSiswaTarget
          )}") tidak ditemukan di Google Sheet.`,
        },
        { status: 404 }
      );
    }

    mapDataToRow(
      targetRow,
      extractedData,
      aktaData,
      namaSiswaTarget
    );

    await targetRow.save();

    return NextResponse.json({
      success: true,
      message:
        "Data berhasil disinkronkan dengan Google Sheet.",
    });
  } catch (error: unknown) {
    console.error(
      "[API /update-sheet]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Terjadi kesalahan saat menyimpan data ke Google Sheet.",
      },
      { status: 500 }
    );
  }
}