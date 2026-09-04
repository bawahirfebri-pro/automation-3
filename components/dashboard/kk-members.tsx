import type { KkResult } from "@/types/kk";
import { formatTeksTampilan } from "@/lib/text-formatter";

interface KkMembersProps {
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

function getJenisKelaminBadgeClass(
  value: string | null | undefined
): string {
  const gender = value?.trim().toLowerCase() || "";

  if (gender === "l" || gender.includes("laki")) {
    return "bg-blue-50 text-blue-600";
  }

  if (gender === "p" || gender.includes("perempuan")) {
    return "bg-rose-50 text-rose-600";
  }

  return "bg-gray-100 text-gray-500";
}

export default function KkMembers({
  data,
  studentName,
  isLoading = false,
}: KkMembersProps) {
if (isLoading) {
  return (
    <section className="col-span-12">
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col items-center px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
          </div>

          <p className="text-sm font-semibold text-gray-700">
            Memuat anggota keluarga
          </p>

          <p className="mt-1 max-w-[280px] text-xs leading-5 text-gray-400">
            Sedang menyesuaikan anggota keluarga dengan siswa yang dipilih.
          </p>
        </div>
      </div>
    </section>
  );
}
  if (!data) {
    return (
      <section className="col-span-12">
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
          <div className="px-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 5.75A2.75 2.75 0 0 1 6.5 3h11A2.75 2.75 0 0 1 20.25 5.75v12.5A2.75 2.75 0 0 1 17.5 21h-11a2.75 2.75 0 0 1-2.75-2.75V5.75Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 7.5h9M7.5 11h9M7.5 14.5h5"
                />
              </svg>
            </div>

            <p className="text-sm font-medium text-gray-600">
              Anggota keluarga belum tersedia
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Ekstrak dokumen KK untuk menampilkan daftar anggota keluarga.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const anggotaKeluarga = data.anggota_keluarga ?? [];
  const normalizedStudentName = normalizeName(studentName);

  return (
    <section className="col-span-12">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Anggota Keluarga
            </h2>

            <p className="mt-0.5 text-xs text-gray-500">
              {anggotaKeluarga.length} anggota terdeteksi
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] text-gray-400 md:inline-flex">
              Geser tabel
              <span aria-hidden="true">→</span>
            </span>

            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
              {anggotaKeluarga.length} anggota
            </span>
          </div>
        </div>

        {anggotaKeluarga.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-gray-500">
              Tidak ada anggota keluarga yang berhasil dibaca.
            </p>
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[1400px] text-left text-sm">
              <thead className="sticky top-0 z-20 bg-gray-50/95 text-[10px] font-semibold uppercase tracking-wide text-gray-400 backdrop-blur">
                <tr>
                  <th className="sticky left-0 z-30 w-[150px] min-w-[150px] whitespace-nowrap border-b border-gray-100 bg-gray-50 px-4 py-3">
                    NIK
                  </th>
                  <th className="sticky left-[150px] z-30 min-w-[210px] border-b border-gray-100 bg-gray-50 px-4 py-3 shadow-[4px_0_8px_-6px_rgba(0,0,0,0.25)]">
                    Nama Lengkap
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 text-center">
                    J.K.
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3">
                    Tempat Lahir
                  </th>
                  <th className="whitespace-nowrap border-b border-gray-100 px-4 py-3">
                    Tgl Lahir
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3 text-center">
                    Goldar
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3">
                    Agama
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3">
                    Pendidikan
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3">
                    Pekerjaan
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3">
                    Status
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3">
                    Nama Ayah
                  </th>
                  <th className="border-b border-gray-100 px-4 py-3">
                    Nama Ibu
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {anggotaKeluarga.map((anggota, index) => {
                  const normalizedMemberName = normalizeName(anggota.nama_lengkap || "");
                  const isTargetStudent =
                    normalizedStudentName !== "" &&
                    normalizedMemberName === normalizedStudentName;

                  const stickyBackground = isTargetStudent
                    ? "bg-blue-50"
                    : "bg-white";

                  return (
                    <tr
                      key={`${anggota.nik}-${index}`}
                      className={
                        isTargetStudent
                          ? "bg-blue-50/70 transition-colors hover:bg-blue-100/60"
                          : "transition-colors hover:bg-gray-50/80"
                      }
                    >
                      <td
                        className={`sticky left-0 z-10 w-[150px] min-w-[150px] whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 ${stickyBackground}`}
                      >
                        {anggota.nik || "-"}
                      </td>

                      <td
                        className={`sticky left-[150px] z-10 min-w-[210px] px-4 py-3 shadow-[4px_0_8px_-6px_rgba(0,0,0,0.25)] ${stickyBackground}`}
                      >
                        <span
                          className={
                            isTargetStudent
                              ? "font-semibold text-blue-900"
                              : "font-medium text-gray-900"
                          }
                        >
                          {formatTeksTampilan(anggota.nama_lengkap)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
  <span
    className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${getJenisKelaminBadgeClass(
      anggota.jenis_kelamin
    )}`}
  >
    {formatJenisKelamin(anggota.jenis_kelamin)}
  </span>
</td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatTeksTampilan(anggota.tempat_lahir)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                        {anggota.tanggal_lahir || "-"}
                      </td>

                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {anggota.golongan_darah || "-"}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatTeksTampilan(anggota.agama)}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatTeksTampilan(anggota.pendidikan)}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatTeksTampilan(anggota.jenis_pekerjaan)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                          {formatTeksTampilan(
                            anggota.status_hubungan_dalam_keluarga
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatTeksTampilan(anggota.nama_ayah)}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {formatTeksTampilan(anggota.nama_ibu)}
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