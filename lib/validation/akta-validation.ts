import type { AktaResult } from "@/types/akta";

const validateRequiredField = (
  value: string,
  label: string
): string | null => {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return `${label} kosong atau tidak berhasil dibaca.`;
  }

  return null;
};

const validateAnakKe = (
  anakKe: string
): string | null => {
  const value = anakKe.trim();

  if (!value) {
    return "Informasi anak ke- kosong atau tidak berhasil dibaca.";
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return `Informasi anak ke- tidak valid: "${value}".`;
  }

  return null;
};

export const validateAktaResult = (
  resultAkta: AktaResult | null
): string[] => {
  if (!resultAkta) {
    return [];
  }

  const warnings: string[] = [];

  const noAktaWarning = validateRequiredField(
    resultAkta.no_akta_kelahiran,
    "Nomor Akta Kelahiran"
  );

  if (noAktaWarning) {
    warnings.push(noAktaWarning);
  }

  const namaAnakWarning = validateRequiredField(
    resultAkta.nama_anak,
    "Nama anak"
  );

  if (namaAnakWarning) {
    warnings.push(namaAnakWarning);
  }

  const tempatLahirWarning = validateRequiredField(
    resultAkta.tempat_lahir,
    "Tempat lahir"
  );

  if (tempatLahirWarning) {
    warnings.push(tempatLahirWarning);
  }

  const tanggalLahirWarning = validateRequiredField(
    resultAkta.tanggal_lahir,
    "Tanggal lahir"
  );

  if (tanggalLahirWarning) {
    warnings.push(tanggalLahirWarning);
  }

  const anakKeWarning = validateAnakKe(
    resultAkta.anak_ke
  );

  if (anakKeWarning) {
    warnings.push(anakKeWarning);
  }

  const namaAyahWarning = validateRequiredField(
    resultAkta.nama_ayah,
    "Nama ayah"
  );

  if (namaAyahWarning) {
    warnings.push(namaAyahWarning);
  }

  const namaIbuWarning = validateRequiredField(
    resultAkta.nama_ibu,
    "Nama ibu"
  );

  if (namaIbuWarning) {
    warnings.push(namaIbuWarning);
  }

  return warnings;
};