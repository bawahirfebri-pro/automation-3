import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { status: 'error', message: 'GEMINI_API_KEY belum dipasang di .env.local' },
        { status: 500 }
      );
    }

    // Inisialisasi SDK Gemini
    const ai = new GoogleGenAI({ apiKey });

    // Menggunakan model terbaru yang tersedia dari daftar Anda
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Halo Gemini! Tolong balas dengan kata: "Koneksi Sukses 100%"',
    });

    return NextResponse.json({
      status: 'success',
      message: 'Koneksi ke Gemini API Berhasil!',
      response: response.text,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal terhubung ke Gemini API';
    
    return NextResponse.json(
      { status: 'error', message: errorMessage },
      { status: 500 }
    );
  }
}