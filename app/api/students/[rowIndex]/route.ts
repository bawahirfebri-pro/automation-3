import { NextResponse } from "next/server";
import {
  getSheetValue,
  getStudentSheetRow,
} from "@/lib/sheets/student-sheet";

import { mapRowToStudentDetail } from "@/lib/sheets/student-detail-mapper";

import { mapDataToRow } from "@/lib/sheets/sheet-mapper";
import { validateExtractedKk } from "@/lib/validation/kk-validation";
import { extractStudentNameFromFilename } from "@/lib/documents/document-name";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

interface RouteContext {
  params: Promise<{ rowIndex: string }>;
}

interface UpdateStudentRequest {
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  fileName: string;
}

async function resolveTargetRow(
  rowIndex: string
) {
  const targetRowNumber = Number(rowIndex);

  if (!Number.isInteger(targetRowNumber)) {
    return {
      row: null,
      error: NextResponse.json(
        {
          success: false,
          message:
            "Nomor baris murid tidak valid.",
        },
        { status: 400 }
      ),
    };
  }

  const row =
    await getStudentSheetRow(
      targetRowNumber
    );

  if (!row) {
    return {
      row: null,
      error: NextResponse.json(
        {
          success: false,
          message:
            "Data murid tidak ditemukan.",
        },
        { status: 404 }
      ),
    };
  }

  return {
    row,
    error: null,
  };
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,'’`-]/g, " ")
    .replace(/\s+/g, " ");
}

function namesEqual(a: string, b: string): boolean {
  const first = normalizeName(a);
  const second = normalizeName(b);

  return Boolean(first && second && first === second);
}

function kkContainsStudent(
  data: KkResult,
  targetName: string
): boolean {
  return data.anggota_keluarga.some((anggota) =>
    namesEqual(anggota.nama_lengkap, targetName)
  );
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { rowIndex } =
      await context.params;

    const {
  row: targetRow,
  error,
} = await resolveTargetRow(rowIndex);

    if (error || !targetRow) {
      return error;
    }

  const detail =
  mapRowToStudentDetail(
    targetRow
  );

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error: unknown) {
    console.error(
      "[GET /api/students/[rowIndex]]",
      error
    );

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
    const { rowIndex } =
      await context.params;

    const {
  row: targetRow,
  error,
} = await resolveTargetRow(rowIndex);

    if (error || !targetRow) {
      return error;
    }

    const body =
      (await request.json()) as UpdateStudentRequest;

    const {
      extractedData,
      aktaData,
      fileName,
    } = body;

    if (!extractedData && !aktaData) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tidak ada data KK atau Akta untuk disinkronkan.",
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * 1. VALIDASI KK
     * ========================================================
     */

    if (extractedData) {
      const validationError =
        validateExtractedKk(
          extractedData
        );

      if (validationError) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Ditolak oleh Server: ${validationError}`,
          },
          { status: 400 }
        );
      }
    }

    /*
     * ========================================================
     * 2. IDENTITAS ROW GOOGLE SHEET
     *
     * Row yang diminta adalah sumber kebenaran utama.
     * ========================================================
     */

    const targetStudentName =
  getSheetValue(
    targetRow,
    "Nama"
  );

    if (!targetStudentName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nama murid pada row Google Sheet kosong.",
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * 3. VALIDASI TARGET DARI FILENAME
     *
     * Frontend mengirim:
     * Adhibah Khaylila Islami_KK.pdf
     *
     * Jika rowIndex ternyata milik Jauza,
     * request HARUS ditolak.
     * ========================================================
     */

    const fileTargetName = fileName
      ? extractStudentNameFromFilename(
          fileName
        )
      : "";

    if (
      fileTargetName &&
      !namesEqual(
        fileTargetName,
        targetStudentName
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Target dokumen "${fileTargetName}" tidak sesuai dengan murid pada baris tujuan "${targetStudentName}".`,
        },
        { status: 409 }
      );
    }

    /*
     * ========================================================
     * 4. VALIDASI SHARED KK
     *
     * KK hanya boleh ditulis ke row siswa jika nama siswa
     * memang terdapat sebagai anggota KK.
     *
     * Jadi:
     *
     * KK Adhibah + Jauza
     * → row Adhibah ✅
     * → row Jauza   ✅
     * → row Budi    ❌
     * ========================================================
     */

    if (
      extractedData &&
      !kkContainsStudent(
        extractedData,
        targetStudentName
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Murid "${targetStudentName}" tidak ditemukan dalam anggota Kartu Keluarga yang akan disimpan.`,
        },
        { status: 409 }
      );
    }

    /*
     * ========================================================
     * 5. VALIDASI AKTA
     *
     * Akta bersifat one-to-one.
     *
     * Akta Adhibah tidak boleh pernah tersimpan ke row Jauza.
     * ========================================================
     */

    if (
      aktaData?.nama_anak &&
      !namesEqual(
        aktaData.nama_anak,
        targetStudentName
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Akta atas nama "${aktaData.nama_anak}" tidak sesuai dengan murid pada baris tujuan "${targetStudentName}".`,
        },
        { status: 409 }
      );
    }

    /*
     * ========================================================
     * 6. NAMA TARGET FINAL
     *
     * Tidak lagi bergantung pada anggota pertama KK.
     * Nama row Google Sheet menjadi canonical target.
     * ========================================================
     */

    const namaSiswaTarget =
      targetStudentName;

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
        "Data murid berhasil disinkronkan.",
    });
  } catch (error: unknown) {
    console.error(
      "[PATCH /api/students/[rowIndex]]",
      error
    );

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