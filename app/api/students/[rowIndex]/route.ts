import { NextResponse } from "next/server";

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

import { mapDataToRow } from "@/lib/sheet-mapper";
import { validateExtractedKk } from "@/lib/validator";
import { extractStudentNameFromFilename } from "@/lib/document-name";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { StudentDetail } from "@/types/student-detail";

interface RouteContext {
  params: Promise<{ rowIndex: string }>;
}

interface UpdateStudentRequest {
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  fileName: string;
}

function getValue(row: any, header: string): string {
  return row.get(header)?.toString().trim() || "";
}

async function getSheet() {
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

async function getTargetRow(rowIndex: string) {
  const targetRowNumber = Number(rowIndex);

  if (!Number.isInteger(targetRowNumber)) {
    return {
      error: NextResponse.json(
        { success: false, message: "Nomor baris murid tidak valid." },
        { status: 400 }
      ),
      row: null,
    };
  }

  const sheet = await getSheet();
  const rows = await sheet.getRows();
  const row = rows.find((item) => item.rowNumber === targetRowNumber);

  if (!row) {
    return {
      error: NextResponse.json(
        { success: false, message: "Data murid tidak ditemukan." },
        { status: 404 }
      ),
      row: null,
    };
  }

  return {
    error: null,
    row,
  };
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { rowIndex } = await context.params;
    const { row: targetRow, error } = await getTargetRow(rowIndex);

    if (error || !targetRow) return error;

    const noKk = getValue(targetRow, "No. Kartu Keluarga");
    const noAkta = getValue(targetRow, "No. Akta Kelahiran");

    const anggotaKeluarga: KkResult["anggota_keluarga"] = [];

    for (let i = 1; i <= 10; i += 1) {
      const nama = getValue(targetRow, `Nama Anggota ${i}`);
      const nik = getValue(targetRow, `NIK Anggota ${i}`);

      if (!nama && !nik) continue;

      anggotaKeluarga.push({
        nama_lengkap: nama,
        nik,
        jenis_kelamin: getValue(targetRow, `Jenis Kelamin Anggota ${i}`),
        status_hubungan_dalam_keluarga: getValue(targetRow, `Status Anggota ${i}`),
        tempat_lahir: getValue(targetRow, `Tempat Lahir Anggota ${i}`),
        tanggal_lahir: getValue(targetRow, `Tanggal Lahir Anggota ${i}`),
        agama: getValue(targetRow, `Agama Anggota ${i}`),
        golongan_darah: getValue(targetRow, `Golongan Darah Anggota ${i}`),
        pendidikan: getValue(targetRow, `Pendidikan Anggota ${i}`),
        jenis_pekerjaan: getValue(targetRow, `Pekerjaan Anggota ${i}`),
        nama_ayah: getValue(targetRow, `Nama Ayah dari Anggota ${i}`),
        nama_ibu: getValue(targetRow, `Nama Ibu dari Anggota ${i}`),
      });
    }

    const kk: KkResult | null = noKk
      ? {
          no_kk: noKk,
          alamat: getValue(targetRow, "Alamat"),
          rt: getValue(targetRow, "RT"),
          rw: getValue(targetRow, "RW"),
          kelurahan: getValue(targetRow, "Desa/Kelurahan"),
          kecamatan: getValue(targetRow, "Kecamatan"),
          kabupaten_kota: getValue(targetRow, "Kabupaten/Kota"),
          provinsi: getValue(targetRow, "Provinsi"),
          kode_pos: getValue(targetRow, "Kode Pos"),
          tanggal_dikeluarkan: getValue(targetRow, "Tanggal Terbit KK"),
          anggota_keluarga: anggotaKeluarga,
        }
      : null;

    const akta: AktaResult | null = noAkta
      ? {
          no_akta_kelahiran: noAkta,
          nama_anak: getValue(targetRow, "Nama"),
          anak_ke: getValue(targetRow, "Anak ke"),
          tempat_lahir: getValue(targetRow, "Tempat Lahir"),
          tanggal_lahir: getValue(targetRow, "Tanggal Lahir"),
          nama_ayah:
            getValue(targetRow, "Nama Ayah Kandung") ||
            getValue(targetRow, "Nama Ayah"),
          nama_ibu:
            getValue(targetRow, "Nama Ibu Kandung") ||
            getValue(targetRow, "Nama Ibu"),
        }
      : null;

    const detail: StudentDetail = { kk, akta };

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error: unknown) {
    console.error("[GET /api/students/[rowIndex]]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal membaca detail murid.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { rowIndex } = await context.params;
    const { row: targetRow, error } = await getTargetRow(rowIndex);

    if (error || !targetRow) return error;

    const body = (await request.json()) as UpdateStudentRequest;
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

    let namaSiswaTarget = fileName
      ? extractStudentNameFromFilename(fileName)
      : "";

    const listAnggota = extractedData?.anggota_keluarga ?? [];

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

    if (!namaSiswaTarget && aktaData?.nama_anak) {
      namaSiswaTarget = aktaData.nama_anak
        .trim()
        .toLowerCase();
    }

    if (!namaSiswaTarget) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama siswa tidak dapat diidentifikasi.",
        },
        { status: 400 }
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
      message: "Data murid berhasil disinkronkan.",
    });
  } catch (error: unknown) {
    console.error("[PATCH /api/students/[rowIndex]]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menyimpan data murid.",
      },
      { status: 500 }
    );
  }
}