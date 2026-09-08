import { NextResponse } from "next/server";

import {
  extractKkPageIdentity,
} from "@/features/student-document-extraction/lib/documents/page-identity";

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "File halaman KK tidak ditemukan.",
        },
        {
          status: 400,
        }
      );
    }

    const identity =
      await extractKkPageIdentity(
        file
      );

    return NextResponse.json(
      identity
    );
  } catch (error) {
    console.error(
      "[KK PAGE IDENTITY API]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca identitas halaman KK.",
      },
      {
        status: 500,
      }
    );
  }
}