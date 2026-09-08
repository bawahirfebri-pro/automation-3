import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3.5-flash-lite";
const MAX_CANDIDATES = 5;
const MIN_INPUT_SCORE = 0.6;

export interface AiStudentCandidate {
  rowIndex: number;
  nama: string;
  score: number;
}

export interface AiStudentMatchParams {
  detectedNames: string[];
  candidates: AiStudentCandidate[];
}

export interface AiStudentMatchResult {
  matched: boolean;
  rowIndex: number | null;
  modelUsed: string;
}

interface GeminiMatchResponse {
  matched?: unknown;
  rowIndex?: unknown;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanDetectedNames(names: string[]): string[] {
  return [...new Set(
    names
      .filter((name): name is string => typeof name === "string")
      .map((name) => name.trim())
      .filter(Boolean)
  )].slice(0, 10);
}

function cleanCandidates(candidates: AiStudentCandidate[]): AiStudentCandidate[] {
  const unique = new Map<number, AiStudentCandidate>();

  for (const candidate of candidates) {
    if (
      !Number.isInteger(candidate?.rowIndex) ||
      typeof candidate?.nama !== "string" ||
      typeof candidate?.score !== "number" ||
      !Number.isFinite(candidate.score) ||
      candidate.score < MIN_INPUT_SCORE
    ) {
      continue;
    }

    const nama = candidate.nama.trim();
    if (!nama) continue;

    const cleaned = {
      rowIndex: candidate.rowIndex,
      nama,
      score: Math.max(0, Math.min(1, candidate.score)),
    };

    const previous = unique.get(cleaned.rowIndex);
    if (!previous || cleaned.score > previous.score) {
      unique.set(cleaned.rowIndex, cleaned);
    }
  }

  return [...unique.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);
}

function parseJsonResponse(text: string): GeminiMatchResponse {
  let jsonText = text.trim();

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

  const parsed: unknown = JSON.parse(jsonText);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Response AI matcher tidak valid.");
  }

  return parsed as GeminiMatchResponse;
}

function createPrompt(
  detectedNames: string[],
  candidates: AiStudentCandidate[]
): string {
  const candidateText = candidates
    .map(
      (candidate, index) =>
        `${index + 1}. rowIndex=${candidate.rowIndex}; nama="${candidate.nama}"; similarity=${candidate.score.toFixed(4)}`
    )
    .join("\n");

  return `Anda adalah validator pencocokan nama murid.

Tugas:
Tentukan apakah salah satu kandidat benar-benar merupakan orang yang sama dengan nama hasil ekstraksi dokumen.

Nama hasil ekstraksi:
${detectedNames.map((name) => `- "${name}"`).join("\n")}

Kandidat yang DIIZINKAN:
${candidateText}

ATURAN KETAT:
1. Anda hanya boleh memilih rowIndex dari daftar kandidat di atas.
2. Jangan membuat nama, siswa, atau rowIndex baru.
3. Kesalahan OCR kecil, huruf hilang, huruf tertukar, spasi, tanda baca, atau variasi penulisan boleh dianggap sama jika identitas nama masih sangat kuat.
4. Kesamaan satu kata, nama depan, nama belakang, atau sebagian nama saja tidak cukup.
5. Jangan memilih kandidat hanya karena similarity tertinggi.
6. Jika dua kandidat sama-sama masuk akal dan tidak dapat dibedakan dengan yakin, jawab matched=false.
7. Jika perubahan nama terlalu besar sehingga mungkin merupakan orang berbeda, jawab matched=false.
8. Lebih baik menolak daripada memasangkan dokumen ke siswa yang salah.

Balas JSON saja tanpa markdown:
{"matched":true,"rowIndex":123}

atau:
{"matched":false,"rowIndex":null}`;
}

export async function matchStudentWithAi(
  params: AiStudentMatchParams
): Promise<AiStudentMatchResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Konfigurasi GEMINI_API_KEY belum tersedia.");
  }

  const detectedNames = cleanDetectedNames(params.detectedNames);
  const candidates = cleanCandidates(params.candidates);

  if (detectedNames.length === 0 || candidates.length === 0) {
    return {
      matched: false,
      rowIndex: null,
      modelUsed: MODEL,
    };
  }

  /*
   * Tidak perlu Gemini jika kandidat ternyata exact setelah normalisasi.
   * Tetapi hanya auto-match bila exact tersebut unik.
   */
  const exactCandidates = candidates.filter((candidate) =>
    detectedNames.some(
      (name) => normalize(name) === normalize(candidate.nama)
    )
  );

  if (exactCandidates.length === 1) {
    return {
      matched: true,
      rowIndex: exactCandidates[0].rowIndex,
      modelUsed: "local-exact",
    };
  }

  if (exactCandidates.length > 1) {
    return {
      matched: false,
      rowIndex: null,
      modelUsed: "local-exact-ambiguous",
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ text: createPrompt(detectedNames, candidates) }],
  });

  if (!response.text) {
    throw new Error("Gemini tidak memberikan hasil pencocokan.");
  }

  let parsed: GeminiMatchResponse;

  try {
    parsed = parseJsonResponse(response.text);
  } catch {
    throw new Error("Response Gemini matcher bukan JSON yang valid.");
  }

  if (parsed.matched !== true) {
    return {
      matched: false,
      rowIndex: null,
      modelUsed: MODEL,
    };
  }

  if (
    typeof parsed.rowIndex !== "number" ||
    !Number.isInteger(parsed.rowIndex)
  ) {
    return {
      matched: false,
      rowIndex: null,
      modelUsed: MODEL,
    };
  }

  /*
   * Guard terpenting:
   * Gemini tidak boleh mengembalikan row di luar kandidat.
   */
  const selectedCandidate = candidates.find(
    (candidate) => candidate.rowIndex === parsed.rowIndex
  );

  if (!selectedCandidate) {
    console.warn(
      `[Student AI Matcher] ${MODEL} mengembalikan rowIndex di luar kandidat: ${parsed.rowIndex}`
    );

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