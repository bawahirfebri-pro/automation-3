export const PROMPT_EKSTRAKSI_KK = `
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