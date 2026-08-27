import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

export interface SaveToSheetParams {
  rowIndex: number;
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  fileName: string;
}

interface SaveToSheetSuccessResponse {
  success: true;
  message?: string;
}

interface SaveToSheetErrorResponse {
  success: false;
  message?: string;
  error?: string;
}

export type SaveToSheetResponse =
  | SaveToSheetSuccessResponse
  | SaveToSheetErrorResponse;

export async function saveToSheet(
  params: SaveToSheetParams
): Promise<SaveToSheetResponse> {
  const response = await fetch(
    `/api/students/${params.rowIndex}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        extractedData: params.extractedData,
        aktaData: params.aktaData,
        fileName: params.fileName,
      }),
    }
  );

  let data: SaveToSheetResponse;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Response server saat menyimpan data tidak valid."
    );
  }

  if (!response.ok) {
    const message =
      data.success === false
        ? data.message ||
          data.error ||
          "Gagal menyimpan data ke Google Sheet."
        : data.message ||
          "Gagal menyimpan data ke Google Sheet.";

    throw new Error(message);
  }

  return data;
}