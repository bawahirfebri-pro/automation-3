import { formatTeksTampilan } from "@/lib/formatting/text-formatter";

import ModuleHeader from "@/features/student/components/module-header";

import type { KkResult } from "@/types/kk";

interface FamilyMembersCardProps {
  data: KkResult | null;
  studentName: string;
  isLoading?: boolean;
}

const normalizeName = (value: string): string => {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
};

function formatJenisKelamin(value: string): string {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ") || "";

  if (normalized.includes("laki")) return "L";
  if (normalized.includes("perempuan")) return "P";

  return "-";
}

function getJenisKelaminBadgeClass(value: string | null | undefined): string {
  const gender = value?.trim().toLowerCase() || "";

  if (gender === "l" || gender.includes("laki")) {
    return "bg-blue-50 text-blue-600";
  }

  if (gender === "p" || gender.includes("perempuan")) {
    return "bg-rose-50 text-rose-600";
  }

  return "bg-gray-100 text-gray-500";
}

function FamilyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 18.5c0-2.2-1.8-4-4-4s-4 1.8-4 4" />
      <circle cx="12" cy="9" r="2.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 16.5c-.5-1.5-1.8-2.6-3.5-2.8M17.5 16.5c.5-1.5 1.8-2.6 3.5-2.8"
      />
      <circle cx="5" cy="9.5" r="2" />
      <circle cx="19" cy="9.5" r="2" />
    </svg>
  );
}

export default function FamilyMembersCard({
  data,
  studentName,
  isLoading = false,
}: FamilyMembersCardProps) {
  if (isLoading) {
    return (
      <section>
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
            Memuat anggota keluarga...
          </div>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section>
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-gray-200 bg-white px-6">
          <div className="text-center">
            <p className="text-[11px] font-medium text-gray-500">Anggota keluarga belum tersedia</p>

            <p className="mt-1 text-[10px] text-gray-400">
              Data keluarga akan tampil setelah Kartu Keluarga tersedia.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const anggotaKeluarga = data.anggota_keluarga ?? [];
  const normalizedStudentName = normalizeName(studentName);

  return (
    <section>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ModuleHeader
          icon={<FamilyIcon />}
          title="Anggota Keluarga"
          description={`No. KK ${data.no_kk || "-"}`}
          withBorder
          trailing={
            <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
              {anggotaKeluarga.length} anggota
            </span>
          }
        />

        {anggotaKeluarga.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-500">
              Tidak ada anggota keluarga yang berhasil dibaca.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-gray-50/80 text-[9px] font-medium tracking-[0.08em] text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Hubungan</th>
                  <th className="px-4 py-2.5 text-center">JK</th>
                  <th className="px-4 py-2.5">Tempat / Tanggal Lahir</th>
                  <th className="px-4 py-2.5">Pendidikan</th>
                  <th className="px-4 py-2.5">Pekerjaan</th>
                  <th className="px-4 py-2.5">Penghasilan</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {anggotaKeluarga.map((anggota, index) => {
                  const normalizedMemberName = normalizeName(anggota.nama_lengkap || "");

                  const isTargetStudent =
                    normalizedStudentName !== "" && normalizedMemberName === normalizedStudentName;

                  /*
                   * Field penghasilan belum tersedia pada KkAnggota.
                   * Nanti ganti nilai ini dengan anggota.penghasilan
                   * setelah kontrak data sudah ditambahkan.
                   */
                  const penghasilan = "-";

                  return (
                    <tr
                      key={`${anggota.nik}-${index}`}
                      className={
                        isTargetStudent ? "bg-blue-50/45" : "transition-colors hover:bg-gray-50/70"
                      }
                    >
                      <td className="px-4 py-2.5">
                        <div className="min-w-[180px]">
                          <p
                            className={`text-[11px] ${
                              isTargetStudent
                                ? "font-semibold text-blue-900"
                                : "font-medium text-gray-800"
                            }`}
                          >
                            {formatTeksTampilan(anggota.nama_lengkap)}
                          </p>

                          <p className="mt-0.5 font-mono text-[9px] text-gray-400">
                            {anggota.nik || "-"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                          {formatTeksTampilan(anggota.status_hubungan_dalam_keluarga)}
                        </span>
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold ${getJenisKelaminBadgeClass(
                            anggota.jenis_kelamin,
                          )}`}
                        >
                          {formatJenisKelamin(anggota.jenis_kelamin)}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        <p className="text-[11px] text-gray-700">
                          {formatTeksTampilan(anggota.tempat_lahir)}
                        </p>

                        <p className="mt-0.5 font-mono text-[9px] text-gray-400">
                          {anggota.tanggal_lahir || "-"}
                        </p>
                      </td>

                      <td className="px-4 py-2.5 text-[11px] text-gray-600">
                        {formatTeksTampilan(anggota.pendidikan)}
                      </td>

                      <td className="px-4 py-2.5 text-[11px] text-gray-600">
                        {formatTeksTampilan(anggota.jenis_pekerjaan)}
                      </td>

                      <td className="px-4 py-2.5 text-[11px] font-medium whitespace-nowrap text-gray-600">
                        {penghasilan}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
