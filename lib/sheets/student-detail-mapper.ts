import type { GoogleSpreadsheetRow } from "google-spreadsheet";

import { getSheetValue } from "@/lib/sheets/student-sheet";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { StudentDetail } from "@/types/student-detail";

export function mapRowToStudentDetail(targetRow: GoogleSpreadsheetRow): StudentDetail {
  const noKk = getSheetValue(targetRow, "No. Kartu Keluarga");

  const noAkta = getSheetValue(targetRow, "No. Akta Kelahiran");

  const anggotaKeluarga: KkResult["anggota_keluarga"] = [];

  for (let i = 1; i <= 10; i += 1) {
    const nama = getSheetValue(targetRow, `Nama Anggota ${i}`);

    const nik = getSheetValue(targetRow, `NIK Anggota ${i}`);

    if (!nama && !nik) continue;

    anggotaKeluarga.push({
      nama_lengkap: nama,
      nik,
      jenis_kelamin: getSheetValue(targetRow, `Jenis Kelamin Anggota ${i}`),
      status_hubungan_dalam_keluarga: getSheetValue(targetRow, `Status Anggota ${i}`),
      tempat_lahir: getSheetValue(targetRow, `Tempat Lahir Anggota ${i}`),
      tanggal_lahir: getSheetValue(targetRow, `Tanggal Lahir Anggota ${i}`),
      agama: getSheetValue(targetRow, `Agama Anggota ${i}`),
      golongan_darah: getSheetValue(targetRow, `Golongan Darah Anggota ${i}`),
      pendidikan: getSheetValue(targetRow, `Pendidikan Anggota ${i}`),
      jenis_pekerjaan: getSheetValue(targetRow, `Pekerjaan Anggota ${i}`),
      nama_ayah: getSheetValue(targetRow, `Nama Ayah dari Anggota ${i}`),
      nama_ibu: getSheetValue(targetRow, `Nama Ibu dari Anggota ${i}`),
    });
  }

  const kk: KkResult | null = noKk
    ? {
        no_kk: noKk,
        alamat: getSheetValue(targetRow, "Alamat"),
        rt: getSheetValue(targetRow, "RT"),
        rw: getSheetValue(targetRow, "RW"),
        kelurahan: getSheetValue(targetRow, "Desa/Kelurahan"),
        kecamatan: getSheetValue(targetRow, "Kecamatan"),
        kabupaten_kota: getSheetValue(targetRow, "Kabupaten/Kota"),
        provinsi: getSheetValue(targetRow, "Provinsi"),
        kode_pos: getSheetValue(targetRow, "Kode Pos"),
        tanggal_dikeluarkan: getSheetValue(targetRow, "Tanggal Terbit KK"),
        anggota_keluarga: anggotaKeluarga,
      }
    : null;

  const akta: AktaResult | null = noAkta
    ? {
        no_akta_kelahiran: noAkta,
        nama_anak: getSheetValue(targetRow, "Nama"),
        anak_ke: getSheetValue(targetRow, "Anak ke"),
        tempat_lahir: getSheetValue(targetRow, "Tempat Lahir"),
        tanggal_lahir: getSheetValue(targetRow, "Tanggal Lahir"),
        nama_ayah:
          getSheetValue(targetRow, "Nama Ayah Kandung") || getSheetValue(targetRow, "Nama Ayah"),
        nama_ibu:
          getSheetValue(targetRow, "Nama Ibu Kandung") || getSheetValue(targetRow, "Nama Ibu"),
      }
    : null;

  return { kk, akta };
}
