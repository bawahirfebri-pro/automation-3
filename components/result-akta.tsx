import type { AktaResult } from "@/types/akta";

interface ResultAktaProps {
  data: AktaResult | null;
}

export default function ResultAkta({
  data,
}: ResultAktaProps) {
  if (!data) return null;

  const fields = [
    {
      label: "No. Akta Kelahiran",
      value: data.no_akta_kelahiran,
      mono: true,
      highlight: true,
    },
    {
      label: "Nama Anak",
      value: data.nama_anak,
      highlight: true,
    },
    {
      label: "Tempat Lahir",
      value: data.tempat_lahir,
    },
    {
      label: "Tanggal Lahir",
      value: data.tanggal_lahir,
      mono: true,
    },
    {
      label: "Nama Ayah",
      value: data.nama_ayah,
    },
    {
      label: "Nama Ibu",
      value: data.nama_ibu,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
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

        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Informasi Akta Kelahiran
          </h2>

          <p className="text-xs text-gray-500">
            Data hasil ekstraksi dokumen
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/50 md:grid-cols-2 md:divide-x md:divide-y-0">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex min-h-[64px] flex-col justify-center px-4 py-3"
            >
              <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {field.label}
              </span>

              <span
                className={`text-sm ${
                  field.mono ? "font-mono" : ""
                } ${
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
      </div>
    </div>
  );
}