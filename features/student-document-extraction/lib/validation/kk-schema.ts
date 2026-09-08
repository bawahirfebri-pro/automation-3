import { z } from "zod";

export const KkAnggotaSchema = z.object({
  nama_lengkap: z.string().default(""),
  nik: z.string().default(""),
  tempat_lahir: z.string().default(""),
  agama: z.string().default(""),
  pendidikan: z.string().default(""),
  jenis_pekerjaan: z.string().default(""),
  golongan_darah: z.string().default(""),
  status_hubungan_dalam_keluarga: z.string().default(""),
  nama_ayah: z.string().default(""),
  nama_ibu: z.string().default(""),
});

export const KkResultSchema = z.object({
  no_kk: z.string().default(""),
  alamat: z.string().default(""),
  rt: z.string().default(""),
  rw: z.string().default(""),
  kelurahan: z.string().default(""),
  kecamatan: z.string().default(""),
  kabupaten_kota: z.string().default(""),
  provinsi: z.string().default(""),
  kode_pos: z.string().default(""),
  tanggal_dikeluarkan: z.string().default(""),

  anggota_keluarga: z
    .array(KkAnggotaSchema)
    .default([]),
});

export type KkSchemaResult = z.infer<
  typeof KkResultSchema
>;