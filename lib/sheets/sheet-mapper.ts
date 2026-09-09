import type { GoogleSpreadsheetRow } from "google-spreadsheet";

import { formatTeksResmi } from "@/lib/formatting/text-formatter";

import type { AktaResult } from "@/types/akta";
import type { KkAnggota, KkResult } from "@/types/kk";

function normalizeName(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatGolonganDarah(value: string | null | undefined): string {
  const result = value?.trim() || "";
  if (!result) return "";
  if (result.toLowerCase() === "tidak tahu") return "Tidak Tahu";
  return result.toUpperCase();
}

function formatJenisKelamin(value: string | null | undefined): string {
  const result = value?.trim() || "";
  const normalized = result.toLowerCase();
  if (normalized.includes("laki")) return "Laki-laki";
  if (normalized.includes("perempuan")) return "Perempuan";
  return result;
}

function setRowValue(
  targetRow: GoogleSpreadsheetRow,
  column: string,
  value: string | null | undefined,
): void {
  const cleanValue = value?.toString().trim() || "";
  if (!cleanValue) return;
  try {
    targetRow.set(column, cleanValue);
  } catch (error) {
    console.error(`[Sheet Mapper] Gagal mengisi kolom "${column}":`, error);
  }
}

function findDataMurid(listAnggota: KkAnggota[], namaSiswaTarget: string): KkAnggota | undefined {
  const target = normalizeName(namaSiswaTarget);
  if (!target) return undefined;
  return listAnggota.find((anggota) => normalizeName(anggota.nama_lengkap) === target);
}

function findDataAyah(listAnggota: KkAnggota[]): KkAnggota | undefined {
  return listAnggota.find((anggota) => {
    const status = (anggota.status_hubungan_dalam_keluarga || "").toLowerCase().trim();
    const jk = (anggota.jenis_kelamin || "").toLowerCase().trim();
    return (status.includes("kepala keluarga") && jk.includes("laki")) || status.includes("suami");
  });
}

function findDataIbu(listAnggota: KkAnggota[]): KkAnggota | undefined {
  return listAnggota.find((anggota) => {
    const status = (anggota.status_hubungan_dalam_keluarga || "").toLowerCase().trim();
    const jk = (anggota.jenis_kelamin || "").toLowerCase().trim();
    return (
      (status.includes("kepala keluarga") && jk.includes("perempuan")) ||
      status.includes("istri") ||
      status.includes("isteri")
    );
  });
}

export function mapDataToRow(
  targetRow: GoogleSpreadsheetRow,
  extractedData: KkResult | null,
  aktaData: AktaResult | null,
  namaSiswaTarget: string,
): void {
  const listAnggota = extractedData?.anggota_keluarga ?? [];
  const dataMurid =
    extractedData && listAnggota.length > 0
      ? findDataMurid(listAnggota, namaSiswaTarget)
      : undefined;

  if (extractedData && listAnggota.length > 0 && !dataMurid) {
    throw new Error(
      `Data siswa "${namaSiswaTarget}" tidak ditemukan secara tepat dalam anggota Kartu Keluarga.`,
    );
  }

  // Akta
  if (aktaData) {
    setRowValue(targetRow, "No. Akta Kelahiran", aktaData.no_akta_kelahiran);
    setRowValue(targetRow, "Anak ke", aktaData.anak_ke);
  }

  if (!extractedData || !dataMurid) return;

  // Murid — Nama tidak ditulis ulang karena Nama di Sheet adalah identitas row.
  setRowValue(targetRow, "NIK", dataMurid.nik);
  setRowValue(targetRow, "Jenis Kelamin", formatJenisKelamin(dataMurid.jenis_kelamin));
  setRowValue(targetRow, "Tempat Lahir", formatTeksResmi(dataMurid.tempat_lahir));
  setRowValue(targetRow, "Tanggal Lahir", dataMurid.tanggal_lahir);
  setRowValue(targetRow, "Agama", formatTeksResmi(dataMurid.agama));
  setRowValue(targetRow, "Golongan Darah", formatGolonganDarah(dataMurid.golongan_darah));
  setRowValue(targetRow, "Nama Ayah Kandung", formatTeksResmi(dataMurid.nama_ayah));
  setRowValue(targetRow, "Nama Ibu Kandung", formatTeksResmi(dataMurid.nama_ibu));

  // KK
  setRowValue(targetRow, "No. Kartu Keluarga", extractedData.no_kk);
  setRowValue(targetRow, "Alamat", formatTeksResmi(extractedData.alamat));
  setRowValue(targetRow, "RT", formatTeksResmi(extractedData.rt));
  setRowValue(targetRow, "RW", formatTeksResmi(extractedData.rw));
  setRowValue(targetRow, "Desa/Kelurahan", formatTeksResmi(extractedData.kelurahan));
  setRowValue(targetRow, "Kecamatan", formatTeksResmi(extractedData.kecamatan));
  setRowValue(targetRow, "Kabupaten/Kota", formatTeksResmi(extractedData.kabupaten_kota));
  setRowValue(targetRow, "Provinsi", formatTeksResmi(extractedData.provinsi));
  setRowValue(targetRow, "Kode Pos", extractedData.kode_pos);
  setRowValue(targetRow, "Tanggal Terbit KK", extractedData.tanggal_dikeluarkan);

  const dataAyahKK = findDataAyah(listAnggota);
  const dataIbuKK = findDataIbu(listAnggota);

  // Ayah
  if (dataAyahKK) {
    setRowValue(targetRow, "Nama Ayah", formatTeksResmi(dataAyahKK.nama_lengkap));
    setRowValue(targetRow, "NIK Ayah", dataAyahKK.nik);
    setRowValue(targetRow, "Tempat Lahir Ayah", formatTeksResmi(dataAyahKK.tempat_lahir));
    setRowValue(targetRow, "Tanggal Lahir Ayah", dataAyahKK.tanggal_lahir);
    setRowValue(targetRow, "Agama Ayah", formatTeksResmi(dataAyahKK.agama));
    setRowValue(targetRow, "Golongan Darah Ayah", formatGolonganDarah(dataAyahKK.golongan_darah));
    setRowValue(targetRow, "Nama Ayah dari Ayah", formatTeksResmi(dataAyahKK.nama_ayah));
    setRowValue(targetRow, "Nama Ibu dari Ayah", formatTeksResmi(dataAyahKK.nama_ibu));
  }

  // Ibu
  if (dataIbuKK) {
    setRowValue(targetRow, "Nama Ibu", formatTeksResmi(dataIbuKK.nama_lengkap));
    setRowValue(targetRow, "NIK Ibu", dataIbuKK.nik);
    setRowValue(targetRow, "Tempat Lahir Ibu", formatTeksResmi(dataIbuKK.tempat_lahir));
    setRowValue(targetRow, "Tanggal Lahir Ibu", dataIbuKK.tanggal_lahir);
    setRowValue(targetRow, "Agama Ibu", formatTeksResmi(dataIbuKK.agama));
    setRowValue(targetRow, "Golongan Darah Ibu", formatGolonganDarah(dataIbuKK.golongan_darah));
    setRowValue(targetRow, "Nama Ayah dari Ibu", formatTeksResmi(dataIbuKK.nama_ayah));
    setRowValue(targetRow, "Nama Ibu dari Ibu", formatTeksResmi(dataIbuKK.nama_ibu));
  }

  // Anggota keluarga
  listAnggota.slice(0, 10).forEach((anggota, index) => {
    const nomor = index + 1;
    setRowValue(targetRow, `Nama Anggota ${nomor}`, formatTeksResmi(anggota.nama_lengkap));
    setRowValue(targetRow, `NIK Anggota ${nomor}`, anggota.nik);
    setRowValue(
      targetRow,
      `Jenis Kelamin Anggota ${nomor}`,
      formatJenisKelamin(anggota.jenis_kelamin),
    );
    setRowValue(
      targetRow,
      `Status Anggota ${nomor}`,
      formatTeksResmi(anggota.status_hubungan_dalam_keluarga),
    );
    setRowValue(targetRow, `Tempat Lahir Anggota ${nomor}`, formatTeksResmi(anggota.tempat_lahir));
    setRowValue(targetRow, `Tanggal Lahir Anggota ${nomor}`, anggota.tanggal_lahir);
    setRowValue(targetRow, `Agama Anggota ${nomor}`, formatTeksResmi(anggota.agama));
    setRowValue(
      targetRow,
      `Golongan Darah Anggota ${nomor}`,
      formatGolonganDarah(anggota.golongan_darah),
    );
    setRowValue(targetRow, `Pendidikan Anggota ${nomor}`, formatTeksResmi(anggota.pendidikan));
    setRowValue(targetRow, `Pekerjaan Anggota ${nomor}`, formatTeksResmi(anggota.jenis_pekerjaan));
    setRowValue(targetRow, `Nama Ayah dari Anggota ${nomor}`, formatTeksResmi(anggota.nama_ayah));
    setRowValue(targetRow, `Nama Ibu dari Anggota ${nomor}`, formatTeksResmi(anggota.nama_ibu));
  });
}
