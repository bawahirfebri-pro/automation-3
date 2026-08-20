import type { AktaResult } from "./akta";
import type { KkResult } from "./kk";

export type DocumentType = "kk" | "akta";

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