import { NextResponse } from "next/server";
import {
  matchStudentWithAi,
  type AiStudentCandidate,
} from "@/lib/student-ai-matcher";

interface MatchStudentRequest {
  detectedNames: string[];
  candidates: AiStudentCandidate[];
}

const MAX_CANDIDATES = 5;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MatchStudentRequest;

    const detectedNames = Array.isArray(body.detectedNames)
      ? body.detectedNames
          .filter((name): name is string => typeof name === "string")
          .map((name) => name.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    const candidates = Array.isArray(body.candidates)
      ? body.candidates
          .filter(
            (candidate) =>
              Number.isInteger(candidate?.rowIndex) &&
              typeof candidate?.nama === "string" &&
              typeof candidate?.score === "number"
          )
          .slice(0, MAX_CANDIDATES)
      : [];

    if (detectedNames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama hasil ekstraksi tidak tersedia.",
        },
        { status: 400 }
      );
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Kandidat siswa tidak tersedia.",
        },
        { status: 400 }
      );
    }

    const result = await matchStudentWithAi({
      detectedNames,
      candidates,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[POST /api/students/match]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mencocokkan nama siswa.",
      },
      { status: 500 }
    );
  }
}