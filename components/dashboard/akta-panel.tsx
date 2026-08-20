import ResultAkta from "@/components/result-akta";
import type { AktaResult } from "@/types/akta";

interface AktaPanelProps {
  data: AktaResult | null;
}

export default function AktaPanel({ data }: AktaPanelProps) {
  return (
    <section className="col-span-12 lg:col-span-6">
      <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Hasil Akta
          </h2>

          <p className="mt-1 text-xs text-gray-400">
            Data yang berhasil diekstrak dari dokumen akta.
          </p>
        </div>

        <ResultAkta data={data} />
      </div>
    </section>
  );
}