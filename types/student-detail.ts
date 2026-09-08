import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

export interface StudentDetail {
  kk: KkResult | null;
  akta: AktaResult | null;
}

export interface StudentDetailBaseline { rowIndex: number; kk: KkResult | null; akta: AktaResult | null; modelUsedKk: string; modelUsedAkta: string; }