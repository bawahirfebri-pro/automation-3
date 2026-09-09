import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

export type HistorySaveStatus = "idle" | "saving" | "success" | "error";

export interface ExtractionHistoryItem {
  id: string;
  studentName: string;
  kk: KkResult | null;
  akta: AktaResult | null;
  modelUsedKk: string;
  modelUsedAkta: string;
  updatedAt: string;
  savedAt?: string;
  /** @deprecated Compatibility untuk history lama sebelum persistence dibuat generic. */
  savedToSheetAt?: string;
}
