import { NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Fungsi helper super-pintar untuk membersihkan dan menata teks sesuai standar ketat
// Fungsi helper super-pintar untuk membersihkan dan menata teks sesuai standar ketat
function formatTeksResmi(str: string): string {
  if (!str) return '';
  let teks = str.trim();

  // Aturan 7: Typo 'Istri' menjadi 'Isteri'
  teks = teks.replace(/\bistri\b/gi, 'Isteri');

  // Aturan 8: Standarisasi 'Belum/Tidak'
  teks = teks.replace(/\b(tidak|blm|belum)\s*\/\s*(tidak|blm|belum)\b/gi, 'Belum/Tidak');
  teks = teks.replace(/\btidak\/blm\b/gi, 'Belum/Tidak');

  // Aturan Singkatan: Standarisasi Jl, Gg, Komp, dan No (wajib ada titik di belakangnya)
  teks = teks.replace(/\b(jl|gg|komp|no)\.?\b/gi, (match) => {
    const lower = match.toLowerCase();
    if (lower.startsWith('jl')) return 'Jl.';
    if (lower.startsWith('gg')) return 'Gg.';
    if (lower.startsWith('komp')) return 'Komp.';
    if (lower.startsWith('no')) return 'No.';
    return match;
  });

  // Aturan 2: Beri spasi setelah titik jika belum ada (Berlaku untuk huruf DAN ANGKA seperti No.22 -> No. 22)
  teks = teks.replace(/\.([a-zA-Z0-9])/g, '. $1');

  // PEMBERSIHAN TITIK GANDA: Pastikan tidak ada titik bertumpuk (misal '..', '. .')
  teks = teks.replace(/\s*\.{2,}\s*/g, '. ');
  teks = teks.replace(/\.\s+\./g, '.');

  // Kapitalisasi Dasar (Setiap awal kata)
  let words = teks.toLowerCase().split(' ');
  words = words.map(word => {
    // Pisahkan juga berdasarkan garis miring untuk Aturan 6 (Setelah garis miring huruf besar)
    let parts = word.split('/');
    parts = parts.map(part => {
      // Kapitalisasi karakter pertama dari setiap part
      return part.charAt(0).toUpperCase() + part.slice(1);
    });
    return parts.join('/');
  });

  let hasil = words.join(' ');

  // KOREKSI KHUSUS (Mengeksekusi Aturan 1, 3, 4, 5) menggunakan Regex Pencarian Kata
  
  // Aturan 1: 'Tidak Tahu'
  hasil = hasil.replace(/\bTidak tahu\b/gi, 'Tidak Tahu');
  
  // Aturan Khusus RT dan RW: rt.02, rt02, rt 02, rt. 02 -> RT 02
  hasil = hasil.replace(/\b(rt|rw)[\s\.]*(\d+)/gi, (match, p1, p2) => {
    return `${p1.toUpperCase()} ${p2}`;
  });
  hasil = hasil.replace(/\b(rt|rw)\b/gi, match => match.toUpperCase());

  // Aturan 3 & 4 & Singkatan Umum: DKI, SLTA, SLTP, SD, SMP, SMA, SMK, MI, MTs, MA, D1, D2, D3, S1, S2, S3
  const singkatan = ['Dki', 'Sd', 'Smp', 'Sma', 'Smk', 'Slta', 'Sltp', 'Mi', 'Mts', 'Ma', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3'];
  singkatan.forEach(s => {
    const regex = new RegExp(`\\b${s}\\b`, 'g');
    const pengganti = s === 'Mts' ? 'MTs' : s.toUpperCase();
    hasil = hasil.replace(regex, pengganti);
  });

  // Aturan 5: Angka Romawi (I sampai XII)
  const romawi = ['I', 'Ii', 'Iii', 'Iv', 'V', 'Vi', 'Vii', 'Viii', 'Ix', 'X', 'Xi', 'Xii'];
  romawi.forEach(r => {
    const regex = new RegExp(`\\b${r}\\b`, 'g');
    hasil = hasil.replace(regex, r.toUpperCase());
  });

  return hasil;
}

export async function POST(request: Request) {
  try {
    const { extractedData, aktaData, fileName } = await request.json();

    if (!extractedData && !aktaData) {
      return NextResponse.json({ success: false, message: 'Tidak ada data KK atau Akta untuk disinkronkan.' }, { status: 400 });
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    // IDENTIFIKASI NAMA SISWA TARGET
    let namaSiswaTarget = "";
    if (fileName) {
      namaSiswaTarget = fileName
        .replace(/_kk\.pdf/i, '')
        .replace(/_akta\.pdf/i, '')
        .replace(/\.pdf/i, '')
        .replace(/_/g, ' ')
        .trim()
        .toLowerCase();
    }

    const listAnggota = extractedData?.anggota_keluarga || [];

    if (!namaSiswaTarget && listAnggota.length > 0) {
      const anak = listAnggota.find((ang: any) => 
        ang.status_hubungan_dalam_keluarga?.toLowerCase().includes('anak')
      );
      namaSiswaTarget = (anak?.nama_lengkap || listAnggota[0]?.nama_lengkap || '').trim().toLowerCase();
    }

    if (!namaSiswaTarget && aktaData?.nama_anak) {
      namaSiswaTarget = aktaData.nama_anak.trim().toLowerCase();
    }

    if (!namaSiswaTarget) {
      return NextResponse.json({ success: false, message: 'Nama siswa tidak dapat diidentifikasi.' }, { status: 400 });
    }

    // CARI BARIS DI GOOGLE SHEET
    let targetRow = rows.find(row => {
      const rowNama = row.get('Nama')?.toString().trim().toLowerCase();
      return rowNama === namaSiswaTarget;
    });

    if (!targetRow) {
      return NextResponse.json({ 
        success: false, 
        message: `Siswa dengan nama ("${formatTeksResmi(namaSiswaTarget)}") tidak ditemukan di Google Sheet.` 
      }, { status: 404 });
    }

    // SINKRONISASI DATA AKTA KELAHIRAN
    if (aktaData && aktaData.no_akta_kelahiran) {
      try { 
        targetRow.set('No. Akta Kelahiran', aktaData.no_akta_kelahiran.toUpperCase()); 
      } catch (e) {
        console.error("Gagal set No. Akta Kelahiran", e);
      }
    }

    // SINKRONISASI DATA KARTU KELUARGA
    if (extractedData && listAnggota.length > 0) {
      const dataMurid = listAnggota.find((ang: any) => 
        ang.nama_lengkap?.toLowerCase().trim() === namaSiswaTarget
      ) || listAnggota.find((ang: any) => ang.status_hubungan_dalam_keluarga?.toLowerCase().includes('anak')) || listAnggota[0] || {};

      targetRow.set('Nama', formatTeksResmi(dataMurid.nama_lengkap));
      targetRow.set('NIK', dataMurid.nik || '');
      targetRow.set('Jenis Kelamin', formatTeksResmi(dataMurid.jenis_kelamin));
      targetRow.set('Tempat Lahir', formatTeksResmi(dataMurid.tempat_lahir));
      targetRow.set('Tanggal Lahir', dataMurid.tanggal_lahir || '');
      targetRow.set('Agama', formatTeksResmi(dataMurid.agama));
      targetRow.set('Golongan Darah', dataMurid.golongan_darah && dataMurid.golongan_darah.toLowerCase() !== 'tidak tahu' ? dataMurid.golongan_darah.toUpperCase() : (dataMurid.golongan_darah ? 'Tidak Tahu' : ''));
      targetRow.set('Nama Ayah Kandung', formatTeksResmi(dataMurid.nama_ayah));
      targetRow.set('Nama Ibu Kandung', formatTeksResmi(dataMurid.nama_ibu));

      targetRow.set('No. Kartu Keluarga', extractedData.no_kk || '');
      targetRow.set('Alamat', formatTeksResmi(extractedData.alamat));
      targetRow.set('RT', formatTeksResmi(extractedData.rt));
      targetRow.set('RW', formatTeksResmi(extractedData.rw));
      targetRow.set('Desa/Kelurahan', formatTeksResmi(extractedData.kelurahan));
      targetRow.set('Kecamatan', formatTeksResmi(extractedData.kecamatan));
      targetRow.set('Kabupaten/Kota', formatTeksResmi(extractedData.kabupaten_kota));
      targetRow.set('Provinsi', formatTeksResmi(extractedData.provinsi));
      targetRow.set('Kode Pos', extractedData.kode_pos || '');
      targetRow.set('Tanggal Terbit KK', extractedData.tanggal_dikeluarkan || '');

      const dataAyahKK = listAnggota.find((ang: any) => {
        const status = ang.status_hubungan_dalam_keluarga?.toLowerCase() || '';
        return status.includes('kepala keluarga') || (ang.jenis_kelamin?.toLowerCase() === 'laki-laki' && !status.includes('anak') && !status.includes('cucu'));
      });

      const dataIbuKK = listAnggota.find((ang: any) => {
        const status = ang.status_hubungan_dalam_keluarga?.toLowerCase() || '';
        return status.includes('isteri') || status.includes('istri');
      });

      if (dataAyahKK) {
        try {
          targetRow.set('Nama Ayah', formatTeksResmi(dataAyahKK.nama_lengkap));
          targetRow.set('NIK Ayah', dataAyahKK.nik || '');
          targetRow.set('Tempat Lahir Ayah', formatTeksResmi(dataAyahKK.tempat_lahir));
          targetRow.set('Tanggal Lahir Ayah', dataAyahKK.tanggal_lahir || '');
          targetRow.set('Agama Ayah', formatTeksResmi(dataAyahKK.agama));
          targetRow.set('Golongan Darah Ayah', dataAyahKK.golongan_darah && dataAyahKK.golongan_darah.toLowerCase() !== 'tidak tahu' ? dataAyahKK.golongan_darah.toUpperCase() : (dataAyahKK.golongan_darah ? 'Tidak Tahu' : ''));
        //   targetRow.set('Pendidikan Ayah', formatTeksResmi(dataAyahKK.pendidikan));
        //   targetRow.set('Pekerjaan Ayah', formatTeksResmi(dataAyahKK.jenis_pekerjaan));
          targetRow.set('Nama Ayah dari Ayah', formatTeksResmi(dataAyahKK.nama_ayah));
          targetRow.set('Nama Ibu dari Ayah', formatTeksResmi(dataAyahKK.nama_ibu));
        } catch (e) {}
      }

      if (dataIbuKK) {
        try {
          targetRow.set('Nama Ibu', formatTeksResmi(dataIbuKK.nama_lengkap));
          targetRow.set('NIK Ibu', dataIbuKK.nik || '');
          targetRow.set('Tempat Lahir Ibu', formatTeksResmi(dataIbuKK.tempat_lahir));
          targetRow.set('Tanggal Lahir Ibu', dataIbuKK.tanggal_lahir || '');
          targetRow.set('Agama Ibu', formatTeksResmi(dataIbuKK.agama));
          targetRow.set('Golongan Darah Ibu', dataIbuKK.golongan_darah && dataIbuKK.golongan_darah.toLowerCase() !== 'tidak tahu' ? dataIbuKK.golongan_darah.toUpperCase() : (dataIbuKK.golongan_darah ? 'Tidak Tahu' : ''));
        //   targetRow.set('Pendidikan Ibu', formatTeksResmi(dataIbuKK.pendidikan));
        //   targetRow.set('Pekerjaan Ibu', formatTeksResmi(dataIbuKK.jenis_pekerjaan));
          targetRow.set('Nama Ayah dari Ibu', formatTeksResmi(dataIbuKK.nama_ayah));
          targetRow.set('Nama Ibu dari Ibu', formatTeksResmi(dataIbuKK.nama_ibu));
        } catch (e) {}
      }

      listAnggota.forEach((ang: any, i: number) => {
        const n = i + 1;
        if (n <= 10) {
          try { targetRow!.set(`Nama Anggota ${n}`, formatTeksResmi(ang.nama_lengkap)); } catch (e) {}
          try { targetRow!.set(`NIK Anggota ${n}`, ang.nik || ''); } catch (e) {}
          try { targetRow!.set(`Status Anggota ${n}`, formatTeksResmi(ang.status_hubungan_dalam_keluarga)); } catch (e) {}
          try { targetRow!.set(`Tempat Lahir Anggota ${n}`, formatTeksResmi(ang.tempat_lahir)); } catch (e) {}
          try { targetRow!.set(`Tanggal Lahir Anggota ${n}`, ang.tanggal_lahir || ''); } catch (e) {}
          try { targetRow!.set(`Agama Anggota ${n}`, formatTeksResmi(ang.agama)); } catch (e) {}
          try { targetRow!.set(`Golongan Darah Anggota ${n}`, ang.golongan_darah && ang.golongan_darah.toLowerCase() !== 'tidak tahu' ? ang.golongan_darah.toUpperCase() : (ang.golongan_darah ? 'Tidak Tahu' : '')); } catch (e) {}
          try { targetRow!.set(`Pendidikan Anggota ${n}`, formatTeksResmi(ang.pendidikan)); } catch (e) {}
          try { targetRow!.set(`Pekerjaan Anggota ${n}`, formatTeksResmi(ang.jenis_pekerjaan)); } catch (e) {}
          try { targetRow!.set(`Nama Ayah dari Anggota ${n}`, formatTeksResmi(ang.nama_ayah)); } catch (e) {}
          try { targetRow!.set(`Nama Ibu dari Anggota ${n}`, formatTeksResmi(ang.nama_ibu)); } catch (e) {}
        }
      });
    }

    await targetRow.save();
    return NextResponse.json({ success: true, message: 'Data berhasil disinkronkan dengan bersih dan sesuai standar!' });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}