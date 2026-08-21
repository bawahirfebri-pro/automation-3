import { GoogleGenAI } from "@google/genai";

export interface AiStudentCandidate {
  rowIndex: number;
  nama: string;
  score: number;
}

interface MatchStudentWithAiParams {
  detectedNames: string[];
  candidates: AiStudentCandidate[];
}

interface AiStudentMatchResult {
  matched: boolean;
  rowIndex: number | null;
  modelUsed: string;
}

const MODEL = "gemini-3.5-flash-lite";

export async function matchStudentWithAi({
  detectedNames,
  candidates,
}: MatchStudentWithAiParams): Promise<AiStudentMatchResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Konfigurasi GEMINI_API_KEY belum tersedia.");
  }

  if (detectedNames.length === 0 || candidates.length === 0) {
    return {
      matched: false,
      rowIndex: null,
      modelUsed: MODEL,
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const candidateText = candidates
    .map(
      (candidate, index) =>
        `${index + 1}. rowIndex=${candidate.rowIndex}; nama="${candidate.nama}"; similarity=${candidate.score}`
    )
    .join("\n");

  const detectedText = detectedNames
    .map((name, index) => `${index + 1}. "${name}"`)
    .join("\n");

  const prompt = `
Tentukan apakah nama siswa hasil ekstraksi cocok dengan salah satu kandidat resmi.

Nama hasil ekstraksi:
${detectedText}

Kandidat resmi:
${candidateText}

Aturan:
- Pilih hanya kandidat yang tersedia.
- Jangan membuat nama baru.
- Toleransi typo, huruf hilang, spasi, dan kesalahan OCR ringan.
- Jika tidak cukup yakin, matched harus false.
- Jika matched false, rowIndex harus 0.
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ text: prompt }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          matched: {
            type: "boolean",
          },
          rowIndex: {
            type: "integer",
          },
        },
        required: ["matched", "rowIndex"],
        additionalProperties: false,
      },
    },
  });

  if (!response.text) {
    throw new Error("AI matcher tidak memberikan hasil.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Response AI matcher bukan JSON yang valid.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Format hasil AI matcher tidak valid.");
  }

  const result = parsed as {
    matched?: unknown;
    rowIndex?: unknown;
  };

  if (
    typeof result.matched !== "boolean" ||
    typeof result.rowIndex !== "number"
  ) {
    throw new Error("Format hasil AI matcher tidak valid.");
  }

  if (!result.matched) {
    return {
      matched: false,
      rowIndex: null,
      modelUsed: MODEL,
    };
  }

  const selectedCandidate = candidates.find(
    (candidate) => candidate.rowIndex === result.rowIndex
  );

  // Guard paling penting:
  // AI tidak boleh memilih row yang tidak kita berikan.
  if (!selectedCandidate) {
    return {
      matched: false,
      rowIndex: null,
      modelUsed: MODEL,
    };
  }

  return {
    matched: true,
    rowIndex: selectedCandidate.rowIndex,
    modelUsed: MODEL,
  };
}