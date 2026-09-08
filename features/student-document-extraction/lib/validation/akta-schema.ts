import { z } from "zod";

export const AktaResultSchema = z.object({
  no_akta_kelahiran: z.string().default(""),
  nama_anak: z.string().default(""),
  anak_ke: z.string().default(""),
  tempat_lahir: z.string().default(""),
  tanggal_lahir: z.string().default(""),
  nama_ayah: z.string().default(""),
  nama_ibu: z.string().default(""),
});

export type AktaSchemaResult = z.infer<
  typeof AktaResultSchema
>;