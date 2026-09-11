import { formatTeksTampilan } from "@/lib/formatting/text-formatter";

import type { KkResult } from "@/types/kk";

interface KkSummaryProps {
  data: KkResult | null;
  modelUsed?: string;
  isLoading?: boolean;
}

export default function KkSummary({ data, modelUsed, isLoading = false }: KkSummaryProps) {
  if (isLoading) {
    return (
      <section className="col-span-12 lg:col-span-6">
        <div className="flex min-h-[408px] items-center justify-center rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col items-center px-6 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
            </div>

            <p className="text-sm font-semibold text-gray-700">Memuat data Kartu Keluarga</p>

            <p className="mt-1 max-w-[280px] text-xs leading-5 text-gray-400">
              Sedang menyiapkan data siswa yang dipilih. Mohon tunggu beberapa saat.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="col-span-12 lg:col-span-6">
        <div className="flex min-h-[408px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
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

            <p className="text-sm font-medium text-gray-600">KK belum diekstrak</p>

            <p className="mt-1 text-xs text-gray-400">
              Upload dan ekstrak dokumen KK untuk menampilkan datanya.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const fields = [
    { label: "Nomor KK", value: data.no_kk, mono: true, highlight: true },
    { label: "Tanggal Terbit", value: data.tanggal_dikeluarkan },
    { label: "Alamat", value: formatTeksTampilan(data.alamat) },
    { label: "RT / RW", value: `${data.rt || "-"} / ${data.rw || "-"}` },
    { label: "Kelurahan / Desa", value: formatTeksTampilan(data.kelurahan) },
    { label: "Kecamatan", value: formatTeksTampilan(data.kecamatan) },
    { label: "Kabupaten / Kota", value: formatTeksTampilan(data.kabupaten_kota) },
    { label: "Provinsi", value: formatTeksTampilan(data.provinsi) },
    { label: "Kode Pos", value: data.kode_pos },
  ];

  return (
    <section className="col-span-12 lg:col-span-6">
      <div className="h-full overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-gray-200/70 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600">
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
                  d="M3.75 5.75A2.75 2.75 0 0 1 6.5 3h11A2.75 2.75 0 0 1 20.25 5.75v12.5A2.75 2.75 0 0 1 17.5 21h-11a2.75 2.75 0 0 1-2.75-2.75V5.75Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 7.5h9M7.5 11h9M7.5 14.5h5"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <h2 className="text-[13px] font-medium tracking-[-0.01em] text-gray-900">
                Kartu Keluarga
              </h2>

              <p className="text-xs text-gray-500">Data alamat dan administrasi keluarga</p>
            </div>
          </div>

          {modelUsed && (
            <div className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
              <span className="text-[9px]">✦</span>
              <span>AI</span>
              <span className="text-violet-300">·</span>
              <span className="max-w-[120px] truncate font-mono">{modelUsed}</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-gray-100 bg-gray-100 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.label}
                className="flex min-h-[58px] flex-col justify-center bg-gray-50/80 px-4 py-2.5"
              >
                <span className="mb-1 text-[10px] font-medium tracking-wide text-gray-400 uppercase">
                  {field.label}
                </span>

                <span
                  className={`text-sm ${field.mono ? "font-mono" : ""} ${
                    field.highlight ? "font-semibold text-gray-900" : "text-gray-700"
                  }`}
                >
                  {field.value || "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
