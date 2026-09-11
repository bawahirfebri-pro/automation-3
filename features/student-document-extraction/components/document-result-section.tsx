import AktaPanel from "@/features/student-document-extraction/components/akta-panel";
import KkMembers from "@/features/student-document-extraction/components/kk-members";
import KkSummary from "@/features/student-document-extraction/components/kk-summary";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

interface DocumentResultSectionProps {
  akta: AktaResult | null;
  kk: KkResult | null;
  modelUsedAkta: string;
  modelUsedKk: string;
  studentName: string;
  isLoading: boolean;
  isAiMatching: boolean;
}

export default function DocumentResultSection({
  akta,
  kk,
  modelUsedAkta,
  modelUsedKk,
  studentName,
  isLoading,
  isAiMatching,
}: DocumentResultSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <KkSummary data={kk} modelUsed={modelUsedKk} isLoading={isLoading} />
        <AktaPanel data={akta} modelUsed={modelUsedAkta} isLoading={isLoading} />
      </div>

      <KkMembers data={kk} studentName={studentName} isLoading={isLoading} />

      {(isLoading || isAiMatching) && (
        <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
          {isAiMatching ? "Mencocokkan nama murid..." : "Memuat detail murid..."}
        </div>
      )}
    </section>
  );
}
