import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

export type ExtractionResult =
  | {
      type: "kk";
      data: KkResult;
      model_used?: string;
    }
  | {
      type: "akta";
      data: AktaResult;
      model_used?: string;
    };