import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ status: 'error', message: 'File tidak ditemukan' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const apiKey = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey });

    // PROMPT BARU: Menambahkan instruksi 'tanggal_dikeluarkan'
    const prompt = `
      Anda adalah asisten ahli ekstraksi dokumen Kartu Keluarga (KK) Indonesia. 
      Baca dokumen KK (PDF) ini dan ekstrak datanya ke format JSON.
      
      ATURAN PENTING:
      1. Pisahkan nilai RT dan RW ke dalam field yang berbeda.
      2. HILANGKAN angka '0' di depan pada nilai RT dan RW (contoh: "05" harus ditulis "5", "002" harus ditulis "2").
      3. Ambil daftar orang/anggota keluarga di dalam KK tersebut ke dalam bentuk array 'anggota_keluarga'.
      4. Pastikan mengambil 16 digit angka NIK untuk setiap anggota keluarga.
      5. Pisahkan nama orang tua menjadi 'nama_ayah' dan 'nama_ibu'.
      6. Cari "tanggal dikeluarkan" atau tanggal pencetakan dokumen KK (biasanya terletak di bagian bawah dekat tanda tangan Pejabat/Kepala Dinas), masukkan ke 'tanggal_dikeluarkan'.
      7. Kembalikan HANYA dalam format JSON yang valid tanpa teks awalan/akhiran atau markdown (\`\`\`).
      
      Struktur JSON wajib:
      {
        "no_kk": "",
        "alamat": "",
        "rt": "",
        "rw": "",
        "kelurahan": "",
        "kecamatan": "",
        "kabupaten_kota": "",
        "provinsi": "",
        "kode_pos": "",
        "tanggal_dikeluarkan": "",
        "anggota_keluarga": [
          {
            "nama_lengkap": "",
            "nik": "",
            "tempat_lahir": "",
            "agama": "",
            "pendidikan": "",
            "jenis_pekerjaan": "",
            "golongan_darah": "",
            "status_hubungan_dalam_keluarga": "",
            "nama_ayah": "",
            "nama_ibu": ""
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf',
          }
        }
      ],
    });

    let jsonString = response.text || "{}";
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const extractedData = JSON.parse(jsonString);

    // Ekstrak Jenis Kelamin & Tanggal Lahir dari NIK
    if (extractedData.anggota_keluarga && Array.isArray(extractedData.anggota_keluarga)) {
      extractedData.anggota_keluarga = extractedData.anggota_keluarga.map((anggota: any) => {
        let jenis_kelamin = "-";
        let tanggal_lahir = "-";

        const nik = anggota.nik?.replace(/\D/g, '') || ""; 
        if (nik.length === 16) {
          let dd = parseInt(nik.substring(6, 8), 10);
          const mm = parseInt(nik.substring(8, 10), 10);
          const yy = parseInt(nik.substring(10, 12), 10);

          if (dd > 40) {
            jenis_kelamin = "Perempuan";
            dd -= 40;
          } else {
            jenis_kelamin = "Laki-laki";
          }

          const fullYear = yy > 30 ? 1900 + yy : 2000 + yy;
          tanggal_lahir = `${dd.toString().padStart(2, '0')}-${mm.toString().padStart(2, '0')}-${fullYear}`;
        }

        return {
          ...anggota,
          jenis_kelamin,
          tanggal_lahir
        };
      });
    }

    return NextResponse.json({
      status: 'success',
      data: extractedData
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan sistem';
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}