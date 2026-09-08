import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

export type ExtractedDocumentType =
  | "kk"
  | "akta"
  | "both"
  | "unknown";

export interface FileExtractionState {
  type: ExtractedDocumentType;
  kk: KkResult | null;
  akta: AktaResult | null;
  modelUsedKk: string;
  modelUsedAkta: string;
}

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
  }
  | {
    type: "both";
    data: {
      kk: KkResult;
      akta: AktaResult;
    };
    model_used?: {
      kk?: string;
      akta?: string;
    };
  }
  | {
    type: "unknown";
    data: null;
  };