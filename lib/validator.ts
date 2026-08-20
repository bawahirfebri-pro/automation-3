// File: lib/validator.ts

export function validateExtractedKk(extractedData: any): string | null {
  if (!extractedData) return null;

  // 1. Cek No. KK
  const rawNoKk = extractedData.no_kk?.toString().trim() || '';
  if (/[a-zA-Z]/.test(rawNoKk) || rawNoKk.replace(/\D/g, '').length !== 16) {
    return 'Nomor KK tidak valid (harus angka murni 16 digit).';
  }

  // 2. Cek NIK Anggota Keluarga
  const listAnggota = extractedData.anggota_keluarga || [];
  for (let ang of listAnggota) {
    const rawNik = ang.nik?.toString().trim() || '';
    if (/[a-zA-Z]/.test(rawNik) || rawNik.replace(/\D/g, '').length !== 16) {
      return `NIK milik ${ang.nama_lengkap || 'anggota'} tidak valid (harus 16 digit angka).`;
    }
  }

  return null; // Mengembalikan null jika lolos semua validasi
}