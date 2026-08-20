import { NextResponse } from "next/server";

import { extractKkDocument } from "@/lib/extraction/kk-extraction";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    // Validasi file
    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          status: "error",
          message: "File PDF tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "File yang dikirim kosong.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          status: "error",
          message: "Ukuran file terlalu besar. Maksimal 10 MB.",
        },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        {
          status: "error",
          message: "Format file harus PDF.",
        },
        { status: 400 }
      );
    }

    // Ekstraksi dokumen
    const result = await extractKkDocument(file);

    return NextResponse.json({
      status: "success",
      model_used: result.modelUsed,
      data: result.data,
    });
  } catch (error) {
    console.error("[API /extract/kk]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memproses dokumen.";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 }
    );
  }
}