import type { StudentSaveData } from "@/features/student-document-extraction/types/student-save";

interface StudentSaveSuccessResponse {
  success: true;
  message?: string;
}

interface StudentSaveErrorResponse {
  success: false;
  message?: string;
  error?: string;
}

type StudentSaveResponse = StudentSaveSuccessResponse | StudentSaveErrorResponse;

export async function saveStudentData(params: StudentSaveData): Promise<StudentSaveResponse> {
  const response = await fetch(`/api/students/${params.rowIndex}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      extractedData: params.extractedData,
      aktaData: params.aktaData,
      fileName: params.fileName,
    }),
  });

  let data: StudentSaveResponse;

  try {
    data = await response.json();
  } catch {
    throw new Error("Response server saat menyimpan data tidak valid.");
  }

  if (!response.ok) {
    const message =
      data.success === false
        ? data.message || data.error || "Gagal menyimpan data murid."
        : data.message || "Gagal menyimpan data murid.";

    throw new Error(message);
  }

  return data;
}
