import { NextResponse } from "next/server";

import { googleSheetStudentRepository } from "@/lib/sheets/google-sheet-student-repository";

export async function GET() {
  try {
    const students = await googleSheetStudentRepository.listStudents();

    return NextResponse.json({ success: true, data: students });
  } catch (error: unknown) {
    console.error("[API /students]", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Gagal membaca daftar murid.",
      },
      { status: 500 },
    );
  }
}
