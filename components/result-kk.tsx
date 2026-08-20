import type { KkResult } from "@/types/kk";

interface ResultKkProps {
  data: KkResult | null;
  modelUsed?: string;
}

export default function ResultKk({
  data,
  modelUsed,
}: ResultKkProps) {
  if (!data) return null;

  const anggotaKeluarga = data.anggota_keluarga ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 5.75A2.75 2.75 0 0 1 6.5 3h11a2.75 2.75 0 0 1 2.75 2.75v12.5A2.75 2.75 0 0 1 17.5 21h-11a2.75 2.75 0 0 1-2.75-2.75V5.75Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 7.5h9M7.5 11h9M7.5 14.5h5"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Informasi Kartu Keluarga
            </h2>

            <p className="text-xs text-gray-500">
              Data hasil ekstraksi dokumen
            </p>
          </div>
        </div>

        {modelUsed && (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
            <span>✦</span>
            <span>AI</span>
            <span className="text-violet-300">·</span>
            <span className="font-mono">{modelUsed}</span>
          </div>
        )}
      </div>

      {/* Informasi KK */}
      <div className="p-5">
        <div className="grid grid-cols-1 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/50 md:grid-cols-2 md:divide-x md:divide-y-0">
          <InfoItem
            label="Nomor KK"
            value={data.no_kk}
            mono
            highlight
          />

          <InfoItem
            label="Tanggal Terbit"
            value={data.tanggal_dikeluarkan}
          />

          <InfoItem
            label="Alamat"
            value={data.alamat}
          />

          <InfoItem
            label="RT / RW"
            value={`${data.rt || "-"} / ${data.rw || "-"}`}
          />

          <InfoItem
            label="Kelurahan / Desa"
            value={data.kelurahan}
          />

          <InfoItem
            label="Kecamatan"
            value={data.kecamatan}
          />

          <InfoItem
            label="Kabupaten / Kota"
            value={data.kabupaten_kota}
          />

          <InfoItem
            label="Provinsi"
            value={data.provinsi}
          />
        </div>
      </div>

      {/* Anggota Keluarga */}
      <div className="border-t border-gray-100">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Anggota Keluarga
            </h3>

            <p className="mt-0.5 text-xs text-gray-500">
              {anggotaKeluarga.length} anggota terdeteksi
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">
                  NIK
                </th>

                <th className="min-w-[170px] px-4 py-3">
                  Nama Lengkap
                </th>

                <th className="px-4 py-3 text-center">
                  J.K.
                </th>

                <th className="px-4 py-3">
                  Tempat Lahir
                </th>

                <th className="whitespace-nowrap px-4 py-3">
                  Tgl Lahir
                </th>

                <th className="px-4 py-3 text-center">
                  Goldar
                </th>

                <th className="px-4 py-3">
                  Agama
                </th>

                <th className="px-4 py-3">
                  Pendidikan
                </th>

                <th className="px-4 py-3">
                  Pekerjaan
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-4 py-3">
                  Nama Ayah
                </th>

                <th className="px-4 py-3">
                  Nama Ibu
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {anggotaKeluarga.map((anggota, index) => (
                <tr
                  key={`${anggota.nik || "anggota"}-${index}`}
                  className="transition-colors hover:bg-gray-50/80"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                    {anggota.nik || "-"}
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-900">
                    {anggota.nama_lengkap || "-"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                      {anggota.jenis_kelamin === "Laki-laki"
                        ? "L"
                        : "P"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {anggota.tempat_lahir || "-"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                    {anggota.tanggal_lahir || "-"}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-gray-600">
                      {anggota.golongan_darah || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {anggota.agama || "-"}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {anggota.pendidikan || "-"}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {anggota.jenis_pekerjaan || "-"}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {anggota.status_hubungan_dalam_keluarga || "-"}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {anggota.nama_ayah || "-"}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {anggota.nama_ibu || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  highlight?: boolean;
}

function InfoItem({
  label,
  value,
  mono = false,
  highlight = false,
}: InfoItemProps) {
  return (
    <div className="flex min-h-[64px] flex-col justify-center px-4 py-3">
      <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </span>

      <span
        className={`text-sm ${
          mono ? "font-mono" : ""
        } ${
          highlight
            ? "font-semibold text-gray-900"
            : "text-gray-700"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );
}