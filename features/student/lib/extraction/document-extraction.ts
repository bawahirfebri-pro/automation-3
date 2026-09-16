import type { AktaResult } from "@/types/akta";
import type { ExtractionResult } from "@/types/extraction";
import type { KkResult } from "@/types/kk";

const API_ENDPOINTS = {
  classify: "/api/extract/classify",
  kk: "/api/extract/kk",
  akta: "/api/extract/akta",
} as const;

import type { ExtractedDocumentType } from "@/types/extraction";

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

interface ClassificationData {
  type: ExtractedDocumentType;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

function getDocumentTypeFromFilename(filename: string): "kk" | "akta" | null {
  const name = filename.toLowerCase();

  if (name.includes("akta")) return "akta";
  if (name.includes("_kk") || name.includes("-kk") || name.includes(" kk")) return "kk";

  return null;
}

async function requestFile<T>(file: File, endpoint: string): Promise<ApiSuccessResponse<T>> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;

  try {
    response = await fetch(endpoint, { method: "POST", body: formData });
  } catch {
    throw new Error(`Gagal memproses ${file.name}: gagal terhubung ke server.`);
  }

  let data: ApiResponse<T>;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Gagal memproses ${file.name}: response server tidak valid.`);
  }

  if (!response.ok || data.status !== "success") {
    const message = data.status === "error" ? data.message || data.error : undefined;

    throw new Error(`Gagal memproses ${file.name}: ${message || "Terjadi kesalahan pada server."}`);
  }

  if (data.data === undefined || data.data === null) {
    throw new Error(`Gagal memproses ${file.name}: data tidak ditemukan.`);
  }

  return data;
}

async function resolveDocumentType(file: File): Promise<ExtractedDocumentType> {
  const knownType = getDocumentTypeFromFilename(file.name);

  if (knownType) return knownType;

  const result = await requestFile<ClassificationData>(file, API_ENDPOINTS.classify);

  const type = result.data.type;

  if (type !== "kk" && type !== "akta" && type !== "both" && type !== "unknown") {
    throw new Error(`Jenis dokumen ${file.name} tidak dapat dikenali.`);
  }

  return type;
}

export async function extractDocument(file: File): Promise<ExtractionResult> {
  const type = await resolveDocumentType(file);

  if (type === "unknown") {
    return { type: "unknown", data: null };
  }

  if (type === "kk") {
    const result = await requestFile<KkResult>(file, API_ENDPOINTS.kk);

    return { type: "kk", data: result.data, model_used: result.model_used };
  }

  if (type === "akta") {
    const result = await requestFile<AktaResult>(file, API_ENDPOINTS.akta);

    return { type: "akta", data: result.data, model_used: result.model_used };
  }

  const [kkResult, aktaResult] = await Promise.all([
    requestFile<KkResult>(file, API_ENDPOINTS.kk),
    requestFile<AktaResult>(file, API_ENDPOINTS.akta),
  ]);

  return {
    type: "both",
    data: { kk: kkResult.data, akta: aktaResult.data },
    model_used: { kk: kkResult.model_used, akta: aktaResult.model_used },
  };
}
