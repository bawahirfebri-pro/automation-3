import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

interface StudentDetailBaseline {
  rowIndex: number;
  kk: KkResult | null;
  akta: AktaResult | null;
  modelUsedKk: string;
  modelUsedAkta: string;
}

interface Params {
  filesLength: number;
  selectedHistoryId: string;
  primarySessionStudent: StudentRecord | null;
  sessionKkExtraction: FileExtractionState | null;
  sessionAktaExtraction: FileExtractionState | null;
  unregisteredExtraction: FileExtractionState | null;
  activeStudentBaseline: StudentDetailBaseline | null;
  resultKk: KkResult | null;
  resultAkta: AktaResult | null;
  modelUsedKk: string;
  modelUsedAkta: string;
}

export function getActiveDocumentView({
  filesLength,
  selectedHistoryId,
  primarySessionStudent,
  sessionKkExtraction,
  sessionAktaExtraction,
  unregisteredExtraction,
  activeStudentBaseline,
  resultKk,
  resultAkta,
  modelUsedKk,
  modelUsedAkta,
}: Params) {
  return {
    activeKk: filesLength === 0 ? resultKk : sessionKkExtraction?.kk ?? unregisteredExtraction?.kk ?? activeStudentBaseline?.kk ?? null,
    activeAkta: filesLength === 0 ? resultAkta : sessionAktaExtraction?.akta ?? unregisteredExtraction?.akta ?? activeStudentBaseline?.akta ?? null,
    activeModelUsedKk: filesLength === 0 ? modelUsedKk : sessionKkExtraction?.modelUsedKk ?? unregisteredExtraction?.modelUsedKk ?? activeStudentBaseline?.modelUsedKk ?? "",
    activeModelUsedAkta: filesLength === 0 ? modelUsedAkta : sessionAktaExtraction?.modelUsedAkta ?? unregisteredExtraction?.modelUsedAkta ?? activeStudentBaseline?.modelUsedAkta ?? "",
    activeStudentName: selectedHistoryId && filesLength === 0 ? selectedHistoryId : primarySessionStudent?.nama ?? "",
  };
}