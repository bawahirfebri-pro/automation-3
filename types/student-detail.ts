import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

export interface StudentDetail {
  kk: KkResult | null;
  akta: AktaResult | null;
}