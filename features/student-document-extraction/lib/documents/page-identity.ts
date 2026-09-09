import { GoogleGenAI } from "@google/genai";

import type { PageDocumentType, PageIdentity } from "@/types/page-identity";

const MODELS_TO_TRY = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"] as const;

const PAGE_IDENTITY_PROMPT = `
Anda membaca SATU halaman PDF.

Tentukan jenis dokumen pada halaman ini.

Nilai documentType hanya boleh:
- "kk" jika halaman merupakan Kartu Keluarga Indonesia.
- "akta" jika halaman merupakan Akta Kelahiran.
- "unknown" jika halaman bukan Kartu Keluarga dan bukan Akta Kelahiran.

Jika halaman jelas memiliki judul "KARTU KELUARGA",
documentType harus "kk" walaupun nomor KK atau sebagian
teks tidak terbaca dengan sempurna.

Jika documentType adalah "kk":
- ambil noKk jika terlihat.
- ambil namaKepalaKeluarga jika terlihat.
- jika tidak terbaca, gunakan string kosong.

Jika documentType bukan "kk":
- noKk harus string kosong.
- namaKepalaKeluarga harus string kosong.

SPTJM, surat sekolah, formulir, surat dinas,
dan dokumen lain yang bukan KK/Akta harus "unknown".

Jangan menebak nomor KK.
Jangan mengambil NIK sebagai nomor KK.
`;

function normalizeKkNumber(value: string): string {
  return value.replace(/\D/g, "").trim();
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function extractKkPageIdentity(file: File): Promise<PageIdentity> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Konfigurasi GEMINI_API_KEY belum tersedia.");
  }

  if (!(file instanceof File)) {
    throw new Error("File halaman KK tidak ditemukan.");
  }

  if (file.size === 0) {
    throw new Error(`"${file.name}" kosong.`);
  }

  if (file.type !== "application/pdf") {
    throw new Error(`"${file.name}" bukan file PDF.`);
  }

  const ai = new GoogleGenAI({ apiKey });

  const arrayBuffer = await file.arrayBuffer();

  const buffer = Buffer.from(arrayBuffer);

  const base64Data = buffer.toString("base64");

  let lastError: unknown = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,

        contents: [
          { text: PAGE_IDENTITY_PROMPT },
          { inlineData: { data: base64Data, mimeType: "application/pdf" } },
        ],

        config: {
          responseMimeType: "application/json",

          responseSchema: {
            type: "object",

            properties: {
              documentType: { type: "string", enum: ["kk", "akta", "unknown"] },

              noKk: { type: "string" },

              namaKepalaKeluarga: { type: "string" },
            },

            required: ["documentType", "noKk", "namaKepalaKeluarga"],
          },
        },
      });

      const text = response.text?.trim();

      if (!text) {
        throw new Error("Model tidak menghasilkan identitas halaman.");
      }

      const parsed = JSON.parse(text) as {
        documentType?: string;
        noKk?: string;
        namaKepalaKeluarga?: string;
      };

      const documentType: PageDocumentType =
        parsed.documentType === "kk" || parsed.documentType === "akta"
          ? parsed.documentType
          : "unknown";

      const noKk = normalizeKkNumber(parsed.noKk ?? "");

      const namaKepalaKeluarga = normalizeName(parsed.namaKepalaKeluarga ?? "");

      return {
        documentType,
        noKk: documentType === "kk" ? noKk : "",
        namaKepalaKeluarga: documentType === "kk" ? namaKepalaKeluarga : "",
      };
    } catch (error) {
      lastError = error;

      console.error(`[KK Page Identity] gagal dengan ${modelName}`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gagal membaca identitas halaman KK.");
}
