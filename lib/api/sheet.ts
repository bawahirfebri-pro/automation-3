import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

interface SaveToSheetParams {
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  fileName: string;
}

interface SaveToSheetResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const saveToSheet = async ({
  extractedData,
  aktaData,
  fileName,
}: SaveToSheetParams): Promise<SaveToSheetResponse> => {
  const response = await fetch("/api/update-sheet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      extractedData,
      aktaData,
      fileName,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        "Gagal mengirim data ke Google Sheet."
    );
  }

  return data;
};