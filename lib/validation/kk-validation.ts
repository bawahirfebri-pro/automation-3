import type { KkResult } from "@/types/kk";

const extractDigits = (value: unknown): string => {
  return String(value ?? "").replace(/\D/g, "");
};

const validate16DigitNumber = (
  value: unknown,
  label: string
): string | null => {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return `${label} kosong atau tidak berhasil dibaca.`;
  }

  if (/[a-zA-Z]/.test(rawValue)) {
    return `${label} mengandung huruf abjad: "${rawValue}".`;
  }

  const digits = extractDigits(rawValue);

  if (digits.length !== 16) {
    return `${label} terbaca ${digits.length} digit (wajib 16 digit).`;
  }

  return null;
};

const validateTanggalLahir = (
  value: unknown,
  nama: string
): string | null => {
  const tanggal = String(value ?? "").trim();

  if (!tanggal || tanggal === "-" || !/\d/.test(tanggal)) {
    return `Tanggal lahir milik ${nama} kosong atau tidak berhasil dibaca.`;
  }

  return null;
};

export const validateKkResult = (
  resultKk: KkResult | null
): string[] => {
  if (!resultKk) {
    return [];
  }

  const warnings: string[] = [];

  const noKkWarning = validate16DigitNumber(
    resultKk.no_kk,
    "Nomor KK"
  );

  if (noKkWarning) {
    warnings.push(noKkWarning);
  }

  if (!Array.isArray(resultKk.anggota_keluarga)) {
    warnings.push("Data anggota keluarga tidak ditemukan.");
    return warnings;
  }

  resultKk.anggota_keluarga.forEach((anggota, index) => {
    const nama =
      anggota.nama_lengkap?.trim() ||
      `Anggota baris ke-${index + 1}`;

    const nikWarning = validate16DigitNumber(
      anggota.nik,
      `NIK milik ${nama}`
    );

    if (nikWarning) {
      warnings.push(nikWarning);
    }

    const tanggalWarning = validateTanggalLahir(
      anggota.tanggal_lahir,
      nama
    );

    if (tanggalWarning) {
      warnings.push(tanggalWarning);
    }
  });

  return warnings;
};