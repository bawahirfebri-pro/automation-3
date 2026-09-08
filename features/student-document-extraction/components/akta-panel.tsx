import type { AktaResult } from "@/types/akta";
import { formatTeksTampilan } from "@/lib/formatting/text-formatter";

interface AktaPanelProps {
  data: AktaResult | null;
  modelUsed: string;
  isLoading?: boolean;
}

export default function AktaPanel({
  data,
  modelUsed,
  isLoading = false,
}: AktaPanelProps) {
if (isLoading) {
  return (
    <section className="col-span-12 lg:col-span-6">
      <div className="flex min-h-[408px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col items-center px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
          </div>

          <p className="text-sm font-semibold text-gray-700">
            Memuat data Akta Kelahiran
          </p>

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
        <div className="flex min-h-[408px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
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
                  d="M6 2.75h9.5L20 7.25V21a.25.25 0 0 1-.25.25H6A1.25 1.25 0 0 1 4.75 20V4A1.25 1.25 0 0 1 6 2.75Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 2.75V7h4.25M8 11h8M8 14.5h8M8 18h5"
                />
              </svg>
            </div>

            <p className="text-sm font-medium text-gray-600">
              Akta belum diekstrak
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Upload dan ekstrak dokumen Akta untuk menampilkan datanya.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const fields = [
    {
      label: "No. Akta Kelahiran",
      value: data.no_akta_kelahiran,
      mono: true,
      highlight: true,
    },
    {
      label: "Nama Anak",
      value: formatTeksTampilan(data.nama_anak),
      highlight: true,
    },
    {
      label: "Anak Ke-",
      value: data.anak_ke,
    },
    {
      label: "Tempat Lahir",
      value: formatTeksTampilan(data.tempat_lahir),
    },
    {
      label: "Tanggal Lahir",
      value: data.tanggal_lahir,
      mono: true,
    },
    {
      label: "Nama Ayah",
      value: formatTeksTampilan(data.nama_ayah),
    },
    {
      label: "Nama Ibu",
      value: formatTeksTampilan(data.nama_ibu),
    },
  ];

  return (
    <section className="col-span-12 lg:col-span-6">
      <div className="flex min-h-[408px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex min-h-[73px] items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
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
                  d="M6 2.75h9.5L20 7.25V21a.25.25 0 0 1-.25.25H6A1.25 1.25 0 0 1 4.75 20V4A1.25 1.25 0 0 1 6 2.75Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 2.75V7h4.25M8 11h8M8 14.5h8M8 18h5"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">
                Informasi Akta Kelahiran
              </h2>

              <p className="text-xs text-gray-500">
                Data hasil ekstraksi dokumen
              </p>
            </div>
          </div>

          {modelUsed && (
            <div className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700">
              <span className="text-[9px]">✦</span>
              <span>AI</span>
              <span className="text-violet-300">·</span>
              <span className="max-w-[120px] truncate font-mono">
                {modelUsed}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 p-4">
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-gray-50/80">
            <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.label}
                  className="flex min-h-[58px] flex-col justify-center bg-gray-50/80 px-4 py-2.5"
                >
                  <span className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    {field.label}
                  </span>

                  <span
                    className={`text-sm ${field.mono ? "font-mono" : ""} ${
                      field.highlight
                        ? "font-semibold text-gray-900"
                        : "text-gray-700"
                    }`}
                  >
                    {field.value || "-"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex-1 bg-gray-50/80" />
          </div>
        </div>
      </div>
    </section>
  );
}