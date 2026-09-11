import DocumentResultSection from "@/features/student-document-extraction/components/document-result-section";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { StudentRecord } from "@/types/student";

interface StudentProfileProps {
  student: StudentRecord | null;
  kk: KkResult | null;
  akta: AktaResult | null;
  modelUsedKk: string;
  modelUsedAkta: string;
  isLoading: boolean;
  isAiMatching: boolean;
  hasPendingKk: boolean;
  hasPendingAkta: boolean;
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

type DocumentProfileStatus = "saved" | "pending" | "missing";

function getDocumentStatusLabel(status: DocumentProfileStatus) {
  if (status === "saved") return "Tersimpan";
  if (status === "pending") return "Siap disimpan";
  return "Belum tersedia";
}

function getDocumentStatusClass(status: DocumentProfileStatus) {
  if (status === "saved") return "bg-emerald-50 text-emerald-600";
  if (status === "pending") return "bg-amber-50 text-amber-600";
  return "bg-gray-100 text-gray-400";
}

export default function StudentProfile({
  student,
  kk,
  akta,
  modelUsedKk,
  modelUsedAkta,
  isLoading,
  isAiMatching,
  hasPendingKk,
  hasPendingAkta,
  canSave,
  isSaving,
  onSave,
}: StudentProfileProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center text-[11px] text-gray-400">
        Memuat data murid...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-48 items-center justify-center text-[11px] text-gray-400">
        Pilih murid dari daftar di sebelah kanan.
      </div>
    );
  }

  const kkStatus: DocumentProfileStatus = student.kkComplete
    ? "saved"
    : hasPendingKk
      ? "pending"
      : "missing";

  const aktaStatus: DocumentProfileStatus = student.aktaComplete
    ? "saved"
    : hasPendingAkta
      ? "pending"
      : "missing";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[15px] font-semibold text-gray-600">
              {getInitials(student.nama)}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-gray-900">
                {student.nama}
              </h2>

              <p className="mt-1 text-[11px] text-gray-500">NIK {getValue(student.nik)}</p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                  Kelas {getValue(student.kelas)}
                </span>

                {student.rombel ? (
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                    Rombel {student.rombel}
                  </span>
                ) : null}

                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-medium ${getDocumentStatusClass(
                    kkStatus,
                  )}`}
                >
                  KK · {getDocumentStatusLabel(kkStatus)}
                </span>

                <span
                  className={`rounded-md px-2 py-1 text-[10px] font-medium ${getDocumentStatusClass(
                    aktaStatus,
                  )}`}
                >
                  Akta · {getDocumentStatusLabel(aktaStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {canSave || isSaving ? (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="h-9 rounded-lg bg-gray-900 px-3.5 text-[11px] font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            ) : null}

            {canSave ? (
              <p className="text-[10px] text-amber-600">Ada dokumen baru yang belum disimpan.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200/70 px-4 py-3">
          <h3 className="text-[12px] font-medium text-gray-800">Identitas</h3>
          <p className="mt-0.5 text-[10px] text-gray-400">
            Informasi dasar murid dari data sekolah dan dokumen kependudukan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">Nama</p>
            <p className="mt-1 text-[11px] font-medium text-gray-700">{student.nama}</p>
          </div>

          <div>
            <p className="text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">NIK</p>
            <p className="mt-1 text-[11px] font-medium text-gray-700">{getValue(student.nik)}</p>
          </div>

          <div>
            <p className="text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">
              Kelas / Rombel
            </p>
            <p className="mt-1 text-[11px] font-medium text-gray-700">
              {getValue(student.kelas)}
              {student.rombel ? ` · ${student.rombel}` : ""}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">
              Tempat Lahir
            </p>
            <p className="mt-1 text-[11px] font-medium text-gray-700">
              {getValue(akta?.tempat_lahir)}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">
              Tanggal Lahir
            </p>
            <p className="mt-1 text-[11px] font-medium text-gray-700">
              {getValue(akta?.tanggal_lahir)}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">
              Anak Ke
            </p>
            <p className="mt-1 text-[11px] font-medium text-gray-700">{getValue(akta?.anak_ke)}</p>
          </div>

          <div>
            <p className="text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">
              Nama Ayah
            </p>
            <p className="mt-1 text-[11px] font-medium text-gray-700">
              {getValue(akta?.nama_ayah)}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">
              Nama Ibu
            </p>
            <p className="mt-1 text-[11px] font-medium text-gray-700">{getValue(akta?.nama_ibu)}</p>
          </div>
        </div>
      </section>

      <DocumentResultSection
        akta={akta}
        kk={kk}
        modelUsedAkta={modelUsedAkta}
        modelUsedKk={modelUsedKk}
        studentName={student.nama}
        isLoading={isLoading}
        isAiMatching={isAiMatching}
      />
    </div>
  );
}
