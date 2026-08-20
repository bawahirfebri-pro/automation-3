import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { ExtractionResult } from "@/types/extraction";

const API_ENDPOINTS = {
  kk: "/api/extract/kk",
  akta: "/api/extract/akta",
} as const;

interface ApiSuccessResponse<T> {
  status: "success";
  data: T;
  model_used?: string;
}

interface ApiErrorResponse {
  status: "error";
  message?: string;
  error?: string;
}

type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

export const getDocumentType = (
  filename: string
): "kk" | "akta" => {
  return filename.toLowerCase().includes("akta")
    ? "akta"
    : "kk";
};

async function requestExtraction<T>(
  file: File,
  endpoint: string
): Promise<ApiSuccessResponse<T>> {
  const formData = new FormData();

  formData.append("file", file);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      `Gagal mengekstrak ${file.name}: gagal terhubung ke server.`
    );
  }

  let data: ApiResponse<T>;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Gagal mengekstrak ${file.name}: response server tidak valid.`
    );
  }

  if (
    !response.ok ||
    data.status !== "success"
  ) {
    const message =
      data.status === "error"
        ? data.message || data.error
        : undefined;

    throw new Error(
      `Gagal mengekstrak ${file.name}: ${
        message || "Terjadi kesalahan pada server."
      }`
    );
  }

  if (data.data === undefined || data.data === null) {
    throw new Error(
      `Gagal mengekstrak ${file.name}: data tidak ditemukan.`
    );
  }

  return data;
}

export const extractDocument = async (
  file: File
): Promise<ExtractionResult> => {
  const type = getDocumentType(file.name);

  if (type === "kk") {
    const result =
      await requestExtraction<KkResult>(
        file,
        API_ENDPOINTS.kk
      );

    return {
      type: "kk",
      data: result.data,
      model_used: result.model_used,
    };
  }

  const result =
    await requestExtraction<AktaResult>(
      file,
      API_ENDPOINTS.akta
    );

  return {
    type: "akta",
    data: result.data,
    model_used: result.model_used,
  };
};