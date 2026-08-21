import type { StudentDetail } from "@/types/student-detail";

interface StudentDetailSuccess {
  success: true;
  data: StudentDetail;
}

interface StudentDetailError {
  success: false;
  message: string;
}

type StudentDetailResponse =
  | StudentDetailSuccess
  | StudentDetailError;

export interface StudentMatchCandidate {
  rowIndex: number;
  nama: string;
  score: number;
}

interface StudentMatchSuccess {
  success: true;
  data: {
    matched: boolean;
    rowIndex: number | null;
    modelUsed: string;
  };
}

interface StudentMatchError {
  success: false;
  message: string;
}

type StudentMatchResponse =
  | StudentMatchSuccess
  | StudentMatchError;

export async function getStudentDetail(
  rowIndex: number
): Promise<StudentDetail> {
  const response = await fetch(`/api/students/${rowIndex}`, {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json()) as StudentDetailResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      !data.success
        ? data.message
        : "Gagal membaca detail murid."
    );
  }

  return data.data;
}

export async function matchStudentName(
  detectedNames: string[],
  candidates: StudentMatchCandidate[]
) {
  const response = await fetch("/api/students/match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      detectedNames,
      candidates,
    }),
  });

  const data = (await response.json()) as StudentMatchResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      !data.success
        ? data.message
        : "Gagal mencocokkan nama siswa."
    );
  }

  return data.data;
}