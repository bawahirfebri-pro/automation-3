import ResultAkta from "@/components/result-akta";
import type { AktaResult } from "@/types/akta";

interface AktaPanelProps {
  data: AktaResult | null;
  modelUsed: string;
}

export default function AktaPanel({
  data,
  modelUsed,
}: AktaPanelProps) {
  return (
    <section className="col-span-12 lg:col-span-6">
      <ResultAkta
        data={data}
        modelUsed={modelUsed}
      />
    </section>
  );
}