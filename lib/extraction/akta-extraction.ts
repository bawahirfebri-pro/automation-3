import { GoogleGenAI } from "@google/genai";
import { PROMPT_EKSTRAKSI_AKTA } from "@/lib/prompts/akta-prompt";
import { AktaResultSchema } from "@/lib/validation/akta-schema";
import type { AktaResult } from "@/types/akta";

const MODELS_TO_TRY = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
] as const;

interface ExtractionResult {
  data: AktaResult;
  modelUsed: string;
}

export async function extractAktaDocument(
  file: File
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Konfigurasi GEMINI_API_KEY belum tersedia."
    );
  }

  if (!(file instanceof File)) {
    throw new Error(
      "File Akta tidak ditemukan."
    );
  }

  if (file.size === 0) {
    throw new Error(
      "File Akta kosong."
    );
  }

  if (file.type !== "application/pdf") {
    throw new Error(
      "Dokumen Akta harus berupa file PDF."
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString("base64");

  let lastError: unknown = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const response =
        await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              text: PROMPT_EKSTRAKSI_AKTA,
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf",
              },
            },
          ],
        });

      if (!response.text) {
        throw new Error(
          "Model tidak memberikan hasil ekstraksi."
        );
      }

      let jsonText = response.text.trim();

      // Antisipasi jika model mengembalikan markdown JSON
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error(
          "Response Gemini bukan JSON yang valid."
        );
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error(
          "Format hasil ekstraksi Akta tidak valid."
        );
      }

      const validated =
        AktaResultSchema.parse(parsed);

      const finalData: AktaResult = validated;

      return {
        data: finalData,
        modelUsed: modelName,
      };
    } catch (error) {
      lastError = error;

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error";

      console.warn(
        `[Akta Extraction] ${modelName} gagal: ${errorMessage}`
      );
    }
  }

  const lastErrorMessage =
    lastError instanceof Error
      ? lastError.message
      : "Unknown extraction error";

  throw new Error(
    `Semua model AI gagal memproses dokumen Akta. ${lastErrorMessage}`
  );
}