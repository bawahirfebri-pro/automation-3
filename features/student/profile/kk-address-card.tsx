import ModuleHeader from "@/features/student/components/module-header";

import type { KkResult } from "@/types/kk";

interface KkAddressCardProps {
  data: KkResult | null;
  modelUsed: string;
  isLoading?: boolean;
}

function getValue(value: string | null | undefined) {
  return value?.trim() || "-";
}

function AddressIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
      />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

export default function KkAddressCard({ data, modelUsed, isLoading = false }: KkAddressCardProps) {
  if (isLoading) {
    return (
      <section>
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2.5 text-[10px] text-gray-400">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
            Memuat alamat Kartu Keluarga...
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
            <p className="text-[11px] font-medium text-gray-500">
              Alamat Kartu Keluarga belum tersedia
            </p>

            <p className="mt-1 text-[10px] text-gray-400">
              Data alamat akan tampil setelah Kartu Keluarga tersedia.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const fields = [
    { label: "Alamat", value: getValue(data.alamat), wide: true },
    {
      label: "RT / RW",
      value: data.rt || data.rw ? `${getValue(data.rt)} / ${getValue(data.rw)}` : "-",
    },
    { label: "Kelurahan / Desa", value: getValue(data.kelurahan) },
    { label: "Kecamatan", value: getValue(data.kecamatan) },
    { label: "Kabupaten / Kota", value: getValue(data.kabupaten_kota) },
    { label: "Provinsi", value: getValue(data.provinsi) },
    { label: "Kode Pos", value: getValue(data.kode_pos) },
  ];

  return (
    <section>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ModuleHeader
          icon={<AddressIcon />}
          title="Alamat Kartu Keluarga"
          description="Alamat sesuai data pada Kartu Keluarga."
          withBorder
          trailing={
            modelUsed ? (
              <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                <span className="text-[9px]">✦</span>
                <span>AI</span>
                <span className="text-violet-300">·</span>
                <span className="max-w-[120px] truncate font-mono">{modelUsed}</span>
              </div>
            ) : null
          }
        />

        <div className="grid grid-cols-1 border-gray-100 sm:grid-cols-2 xl:grid-cols-4">
          {fields.map((field, index) => (
            <div
              key={field.label}
              className={`min-w-0 border-gray-100 px-4 py-3 ${
                index > 0 ? "border-t sm:border-t-0" : ""
              } ${field.wide ? "sm:col-span-2" : ""}`}
            >
              <p className="text-[9px] font-medium tracking-[0.06em] text-gray-400 uppercase">
                {field.label}
              </p>

              <p className="mt-1 text-[11px] leading-4 font-medium break-words text-gray-800">
                {field.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
