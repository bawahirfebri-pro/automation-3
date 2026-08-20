import ResultKk from "@/components/result-kk";
import type { KkResult } from "@/types/kk";

interface KkPanelProps {
  data: KkResult | null;
  modelUsed: string;
}

export default function KkPanel({
  data,
  modelUsed,
}: KkPanelProps) {
  return (
    <section className="col-span-12">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Kartu Keluarga
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Data anggota keluarga yang berhasil dibaca.
          </p>
        </div>

        <ResultKk
          data={data}
          modelUsed={modelUsed}
        />
      </div>
    </section>
  );
}