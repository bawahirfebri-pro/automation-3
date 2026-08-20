export interface KkAnggota {
  nama_lengkap: string;
  nik: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  agama: string;
  pendidikan: string;
  jenis_pekerjaan: string;
  golongan_darah: string;
  status_hubungan_dalam_keluarga: string;
  nama_ayah: string;
  nama_ibu: string;
}

export interface KkResult {
  no_kk: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  kode_pos: string;
  tanggal_dikeluarkan: string;
  anggota_keluarga: KkAnggota[];
}