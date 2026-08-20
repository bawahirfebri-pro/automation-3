import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { formatTeksResmi } from '@/lib/text-formatter';
import { mapDataToRow } from '@/lib/sheet-mapper';
import { validateExtractedKk } from '@/lib/validator'; // Mengambil validator dari lib

export async function POST(request: Request) {
  try {
    const { extractedData, aktaData, fileName } = await request.json();

    if (!extractedData && !aktaData) {
      return NextResponse.json({ success: false, message: 'Tidak ada data KK atau Akta untuk disinkronkan.' }, { status: 400 });
    }

    // Benteng Pertahanan Backend (Menggunakan Helper)
    const validationError = validateExtractedKk(extractedData);
    if (validationError) {
      return NextResponse.json({ success: false, message: `Ditolak oleh Server: ${validationError}` }, { status: 400 });
    }

    // 1. Inisialisasi Google Sheet
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    // 2. Identifikasi Nama Siswa Target
    let namaSiswaTarget = "";
    if (fileName) {
      namaSiswaTarget = fileName.replace(/_kk\.pdf/i, '').replace(/_akta\.pdf/i, '').replace(/\.pdf/i, '').replace(/_/g, ' ').trim().toLowerCase();
    }

    const listAnggota = extractedData?.anggota_keluarga || [];
    if (!namaSiswaTarget && listAnggota.length > 0) {
      const anak = listAnggota.find((ang: any) => ang.status_hubungan_dalam_keluarga?.toLowerCase().includes('anak'));
      namaSiswaTarget = (anak?.nama_lengkap || listAnggota[0]?.nama_lengkap || '').trim().toLowerCase();
    }

    if (!namaSiswaTarget && aktaData?.nama_anak) {
      namaSiswaTarget = aktaData.nama_anak.trim().toLowerCase();
    }

    if (!namaSiswaTarget) {
      return NextResponse.json({ success: false, message: 'Nama siswa tidak dapat diidentifikasi.' }, { status: 400 });
    }

    // 3. Cari Baris di Google Sheet
    let targetRow = rows.find(row => row.get('Nama')?.toString().trim().toLowerCase() === namaSiswaTarget);

    if (!targetRow) {
      return NextResponse.json({ 
        success: false, 
        message: `Siswa dengan nama ("${formatTeksResmi(namaSiswaTarget)}") tidak ditemukan di Google Sheet.` 
      }, { status: 404 });
    }

    // 4. Proses Eksekusi Mapping
    mapDataToRow(targetRow, extractedData, aktaData, namaSiswaTarget);

    // 5. Simpan Hasilnya
    await targetRow.save();
    
    return NextResponse.json({ success: true, message: 'Data berhasil disinkronkan dengan bersih dan sesuai standar!' });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}