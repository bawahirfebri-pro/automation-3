import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai"; 

// 1. Inisialisasi menggunakan SDK terbaru (konsisten dengan kode Anda)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ status: "error", message: "Tidak ada file yang diunggah." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    const prompt = `
      Anda adalah asisten admin Tata Usaha sekolah. Tugas Anda mengekstrak informasi dari dokumen Akta Kelahiran Indonesia.
      Dokumen ini bisa berupa Akta Kelahiran Format Lama (mesin tik/tulisan tangan dengan nomor register manual) atau Format Terbaru (SIAK/Digital).

      Tolong temukan dan ekstrak data berikut dalam format JSON murni (tanpa markdown).
      
      Perhatikan standar No. Akta:
      - Standar Lama: Cari di kalimat "Kutipan dari buku Register Akta Kelahiran... Nomor: [TULIS_NOMOR_INI]". Sering mengandung garis miring (/) dan angka romawi.
      - Standar Baru: Cari nomor seri dokumen SIAK, biasanya di bagian atas, di bawah judul KUTIPAN AKTA KELAHIRAN atau di dekat barcode. (contoh: 3174-LT-12345678-0001, AL.730.0123456).

      Berikan JSON dengan struktur ini:
      {
        "no_akta_kelahiran": "...",
        "nama_anak": "...",
        "tempat_lahir": "...",
        "tanggal_lahir": "...",
        "nama_ayah": "...",
        "nama_ibu": "..."
      }
      Jika data tidak terbaca atau kosong, isikan "".
    `;

    // 2. Pemanggilan fungsi yang konsisten (ai.models.generateContent)
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash', // atau gemini-2.5-flash-lite
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          }
        }
      ]
    });

    let text = response.text || "";
    
    // Bersihkan output dari backticks markdown ```json ... ```
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonData = JSON.parse(text);

    return NextResponse.json({ status: "success", data: jsonData });
  } catch (error: any) {
    console.error("Error Extracting Akta:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}