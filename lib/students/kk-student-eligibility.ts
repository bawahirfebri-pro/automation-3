import type { KkAnggota } from "@/types/kk";

const MIN_STUDENT_AGE = 4;
const MAX_STUDENT_AGE = 16;

const ADULT_RELATION_KEYWORDS = [
  "kepala keluarga",
  "suami",
  "istri",
  "ayah",
  "ibu",
  "mertua",
  "orang tua",
];

const CHILD_RELATION_KEYWORDS = ["anak", "cucu"];

export interface KkStudentEligibility {
  eligible: boolean;
  age: number | null;
  reason: "eligible" | "adult-relation" | "too-young" | "too-old";
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,'’`_-]/g, " ")
    .replace(/\s+/g, " ");
}

function parseDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;

  const numericMatch = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);

  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]);
    const year = Number(numericMatch[3]);

    const date = new Date(year, month - 1, day);

    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }

    return null;
  }

  const isoMatch = text.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    const date = new Date(year, month - 1, day);

    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }

    return null;
  }

  const parsed = new Date(text);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateAge(birthDate: string, referenceDate = new Date()): number | null {
  const birth = parseDate(birthDate);
  if (!birth) return null;

  let age = referenceDate.getFullYear() - birth.getFullYear();

  const monthDiff = referenceDate.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age -= 1;
  }

  if (age < 0 || age > 120) return null;

  return age;
}

export function getKkStudentEligibility(
  anggota: KkAnggota,
  referenceDate = new Date(),
): KkStudentEligibility {
  const relation = normalize(anggota.status_hubungan_dalam_keluarga || "");

  const age = calculateAge(anggota.tanggal_lahir || "", referenceDate);

  const adultRelation = ADULT_RELATION_KEYWORDS.some(
    (keyword) => relation === keyword || relation.includes(keyword),
  );

  if (adultRelation) {
    return { eligible: false, age, reason: "adult-relation" };
  }

  if (age !== null && age < MIN_STUDENT_AGE) {
    return { eligible: false, age, reason: "too-young" };
  }

  if (age !== null && age > MAX_STUDENT_AGE) {
    return { eligible: false, age, reason: "too-old" };
  }

  const explicitChild = CHILD_RELATION_KEYWORDS.some(
    (keyword) => relation === keyword || relation.includes(keyword),
  );

  /*
   * Jika status = ANAK/CUCU, langsung eligible selama umur
   * tidak jelas-jelas di luar range.
   *
   * Jika status kosong/tidak dikenal, umur 4–16 tetap boleh
   * masuk matcher supaya OCR status yang kurang sempurna tidak
   * membuang siswa valid.
   */
  if (explicitChild || !relation || age !== null) {
    return { eligible: true, age, reason: "eligible" };
  }

  /*
   * Status tidak dikenal + tanggal lahir juga tidak tersedia.
   * Tetap kita izinkan agar data extraction yang tidak lengkap
   * tidak menyebabkan false negative.
   */
  return { eligible: true, age, reason: "eligible" };
}

export function getEligibleKkStudents(
  anggotaKeluarga: KkAnggota[],
  referenceDate = new Date(),
): KkAnggota[] {
  return anggotaKeluarga.filter((anggota) => {
    const nama = anggota.nama_lengkap?.trim();

    if (!nama) return false;

    return getKkStudentEligibility(anggota, referenceDate).eligible;
  });
}
