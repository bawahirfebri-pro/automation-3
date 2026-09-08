interface NikResult {
  jenis_kelamin: string;
  tanggal_lahir: string;
}

export function parseDataFromNik(
  nikString: string | null | undefined
): NikResult {
  const nik = String(nikString ?? "").replace(/\D/g, "");

  if (nik.length !== 16) {
    return {
      jenis_kelamin: "-",
      tanggal_lahir: "-",
    };
  }

  let tanggal = Number(nik.slice(6, 8));
  const bulan = Number(nik.slice(8, 10));
  const tahun = Number(nik.slice(10, 12));

  let jenis_kelamin = "Laki-laki";

  // Perempuan menggunakan tambahan 40 pada tanggal lahir.
  if (tanggal > 40) {
    jenis_kelamin = "Perempuan";
    tanggal -= 40;
  }

  // Validasi tanggal.
  if (tanggal < 1 || tanggal > 31) {
    return {
      jenis_kelamin,
      tanggal_lahir: "-",
    };
  }

  // Validasi bulan.
  if (bulan < 1 || bulan > 12) {
    return {
      jenis_kelamin,
      tanggal_lahir: "-",
    };
  }

  /*
   * NIK hanya menyimpan 2 digit tahun.
   *
   * Untuk saat ini digunakan batas 30:
   * 00–30 → 2000–2030
   * 31–99 → 1931–1999
   *
   * Ini merupakan pendekatan praktis, bukan informasi
   * abad yang tersimpan secara eksplisit di NIK.
   */
  const fullYear =
    tahun <= 30
      ? 2000 + tahun
      : 1900 + tahun;

  const date = new Date(
    fullYear,
    bulan - 1,
    tanggal
  );

  const isValidDate =
    date.getFullYear() === fullYear &&
    date.getMonth() === bulan - 1 &&
    date.getDate() === tanggal;

  if (!isValidDate) {
    return {
      jenis_kelamin,
      tanggal_lahir: "-",
    };
  }

  const tanggal_lahir =
    `${String(tanggal).padStart(2, "0")}-` +
    `${String(bulan).padStart(2, "0")}-` +
    `${fullYear}`;

  return {
    jenis_kelamin,
    tanggal_lahir,
  };
}