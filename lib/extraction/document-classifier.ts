import { GoogleGenAI } from "@google/genai";

export type ClassifiedDocumentType =
  | "kk"
  | "akta"
  | "both"
  | "unknown";

interface ClassificationResult {
  type: ClassifiedDocumentType;
  modelUsed: string;
}

const CLASSIFIER_MODEL = "gemini-3.5-flash-lite";

const CLASSIFICATION_PROMPT = `
Klasifikasikan dokumen PDF berikut.

Pilih tepat satu:
- "kk" jika dokumen adalah Kartu Keluarga.
- "akta" jika dokumen adalah Akta Kelahiran.
- "both" jika PDF berisi Kartu Keluarga dan Akta Kelahiran sekaligus.
- "unknown" jika dokumen bukan Kartu Keluarga maupun Akta Kelahiran.

Contoh dokumen "unknown":
surat sekolah, SPTJM, formulir, surat pernyataan,
surat keterangan, dokumen administrasi lain,
atau dokumen lain yang bukan KK/Akta.

Jangan mengekstrak data.
Jangan memberikan penjelasan.
`;

export async function classifyDocument(file: File): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error("Konfigurasi GEMINI_API_KEY belum tersedia.");
  if (!(file instanceof File)) throw new Error("File dokumen tidak ditemukan.");
  if (file.size === 0) throw new Error("File dokumen kosong.");
  if (file.type !== "application/pdf") throw new Error("Dokumen harus berupa file PDF.");

  const ai = new GoogleGenAI({ apiKey });

  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  const response = await ai.models.generateContent({
    model: CLASSIFIER_MODEL,
    contents: [
      { text: CLASSIFICATION_PROMPT },
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf",
        },
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
  "kk",
  "akta",
  "both",
  "unknown",
],
          },
        },
        required: ["type"],
        additionalProperties: false,
      },
    },
  });

  if (!response.text) throw new Error("Model classifier tidak memberikan hasil.");

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Response classifier bukan JSON yang valid.");
  }

  if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
    throw new Error("Format hasil klasifikasi tidak valid.");
  }

  const type = (parsed as { type?: unknown }).type;

if (
  type !== "kk" &&
  type !== "akta" &&
  type !== "both" &&
  type !== "unknown"
) {
  throw new Error(
    "Jenis dokumen tidak dapat dikenali."
  );
}

  return {
    type,
    modelUsed: CLASSIFIER_MODEL,
  };
}