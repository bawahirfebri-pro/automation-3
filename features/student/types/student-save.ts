import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

export interface StudentSaveData {
  rowIndex: number;
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  fileName: string;
}
