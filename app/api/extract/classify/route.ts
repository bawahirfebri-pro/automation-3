import { NextResponse } from "next/server";

import { classifyDocument } from "@/features/student-document-extraction/lib/extraction/document-classifier";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { status: "error", message: "File PDF tidak ditemukan." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { status: "error", message: "File yang dikirim kosong." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { status: "error", message: "Ukuran file terlalu besar. Maksimal 10 MB." },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { status: "error", message: "Format file harus PDF." },
        { status: 400 },
      );
    }

    const result = await classifyDocument(file);

    return NextResponse.json({
      status: "success",
      model_used: result.modelUsed,
      data: { type: result.type },
    });
  } catch (error) {
    console.error("[API /extract/classify]", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat mengklasifikasikan dokumen.";

    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
