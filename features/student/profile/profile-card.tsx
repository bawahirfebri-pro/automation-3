import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { StudentRecord } from "@/types/student";

interface ProfileCardProps {
  student: StudentRecord;
  kk: KkResult | null;
  akta: AktaResult | null;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getValue(value: string | null | undefined) {
  return value?.trim() || "-";
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatProfileDate(value: string | null | undefined) {
  const cleanValue = value?.trim();

  if (!cleanValue) return "-";

  const match = cleanValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!match) return cleanValue;

  const [, day, month, year] = match;

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return `${day} ${months[Number(month) - 1] ?? month} ${year}`;
}

function getDocumentBadgeClass(isAvailable: boolean) {
  return isAvailable
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
    : "bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200";
}

export default function ProfileCard({
  student,
  kk,
  akta,
  canSave,
  isSaving,
  onSave,
}: ProfileCardProps) {
  const normalizedStudentName = normalizeName(student.nama);

  const studentFamilyMember =
    kk?.anggota_keluarga.find(
      (anggota) => normalizeName(anggota.nama_lengkap || "") === normalizedStudentName,
    ) ?? null;

  const tempatLahir = akta?.tempat_lahir || studentFamilyMember?.tempat_lahir;

  const tanggalLahir = akta?.tanggal_lahir || studentFamilyMember?.tanggal_lahir;

  const jenisKelamin = studentFamilyMember?.jenis_kelamin;
  const agama = studentFamilyMember?.agama;

  const namaAyah = akta?.nama_ayah || studentFamilyMember?.nama_ayah;

  const namaIbu = akta?.nama_ibu || studentFamilyMember?.nama_ibu;

  const noHpAyah: string | null = null;
  const noHpIbu: string | null = null;

  const namaWali: string | null = null;
  const noHpWali: string | null = null;

  const fieldClass = "grid grid-cols-[86px_minmax(0,1fr)] items-start gap-2.5";

  const labelClass = "text-[11px] leading-[18px] text-gray-500";

  const valueClass = "min-w-0 text-[12px] font-medium leading-[18px] text-gray-800";

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-semibold text-gray-700">
            {getInitials(student.nama)}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] leading-[18px] font-semibold tracking-[-0.015em] text-gray-950">
              {student.nama}
            </h2>

            <p className="mt-0.5 truncate font-mono text-[10.5px] leading-4 text-gray-500">
              {getValue(student.nik)}
            </p>

            <p className="mt-0.5 text-[11.5px] font-medium text-gray-700">
              Kelas {getValue(student.kelas)}
              {student.rombel ? ` · ${student.rombel}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-medium ${getDocumentBadgeClass(
              student.kkComplete,
            )}`}
          >
            KK
          </span>

          <span
            className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-medium ${getDocumentBadgeClass(
              student.aktaComplete,
            )}`}
          >
            Akta
          </span>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3">
          <h3 className="text-[12.5px] font-semibold text-gray-900">Profile</h3>

          <dl className="mt-2 space-y-1.5">
            <div className={fieldClass}>
              <dt className={labelClass}>Jenis kelamin</dt>
              <dd className={valueClass}>{getValue(jenisKelamin)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Lahir</dt>
              <dd className={valueClass}>
                {getValue(tempatLahir)}
                {tanggalLahir ? `, ${formatProfileDate(tanggalLahir)}` : ""}
              </dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Agama</dt>
              <dd className={valueClass}>{getValue(agama)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Anak ke</dt>
              <dd className={valueClass}>{getValue(akta?.anak_ke)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>No. KK</dt>
              <dd className="min-w-0 font-mono text-[10.5px] leading-[18px] font-medium break-all text-gray-700">
                {getValue(kk?.no_kk)}
              </dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>No. Akta</dt>
              <dd className="min-w-0 font-mono text-[10.5px] leading-[18px] font-medium break-all text-gray-700">
                {getValue(akta?.no_akta_kelahiran)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3">
          <h3 className="text-[12.5px] font-semibold text-gray-900">Orang Tua / Wali</h3>

          <dl className="mt-2 space-y-1.5">
            <div className={fieldClass}>
              <dt className={labelClass}>Ayah</dt>
              <dd className={valueClass}>{getValue(namaAyah)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>No. HP Ayah</dt>
              <dd className={valueClass}>{getValue(noHpAyah)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Ibu</dt>
              <dd className={valueClass}>{getValue(namaIbu)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>No. HP Ibu</dt>
              <dd className={valueClass}>{getValue(noHpIbu)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Wali</dt>
              <dd className={valueClass}>{getValue(namaWali)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>No. HP Wali</dt>
              <dd className={valueClass}>{getValue(noHpWali)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3">
          <h3 className="text-[12.5px] font-semibold text-gray-900">Alamat Domisili</h3>

          <dl className="mt-2 space-y-1.5">
            <div className={fieldClass}>
              <dt className={labelClass}>Alamat</dt>
              <dd className={valueClass}>{getValue(kk?.alamat)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>RT / RW</dt>
              <dd className={valueClass}>
                {kk?.rt || kk?.rw ? `${getValue(kk?.rt)} / ${getValue(kk?.rw)}` : "-"}
              </dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Kelurahan</dt>
              <dd className={valueClass}>{getValue(kk?.kelurahan)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Kecamatan</dt>
              <dd className={valueClass}>{getValue(kk?.kecamatan)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Kota</dt>
              <dd className={valueClass}>{getValue(kk?.kabupaten_kota)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Provinsi</dt>
              <dd className={valueClass}>{getValue(kk?.provinsi)}</dd>
            </div>

            <div className={fieldClass}>
              <dt className={labelClass}>Kode pos</dt>
              <dd className={valueClass}>{getValue(kk?.kode_pos)}</dd>
            </div>
          </dl>
        </div>

        {(canSave || isSaving) && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="h-8 w-full rounded-md bg-gray-950 px-3 text-[11px] font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>

            {canSave ? (
              <p className="mt-1.5 text-[10px] leading-4 text-amber-600">
                Ada perubahan yang belum disimpan.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
