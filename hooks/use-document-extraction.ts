import { useCallback, useState } from "react";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

import { extractDocument } from "@/lib/extraction/document-extraction";

const DEFAULT_MODEL_NAME = "Tidak diketahui";
const DEFAULT_ERROR_MESSAGE =
  "Terjadi kesalahan saat memproses dokumen.";

interface RestoreExtractionData {
  kk: KkResult | null;
  akta: AktaResult | null;
  modelUsedKk?: string;
  modelUsedAkta?: string;
}

interface UseDocumentExtractionReturn {
  isExtracting: boolean;
  resultKk: KkResult | null;
  resultAkta: AktaResult | null;
  modelUsedKk: string;
  modelUsedAkta: string;
  errorMsg: string;
  extract: (files: File[]) => Promise<void>;
  restore: (data: RestoreExtractionData) => void;
  reset: () => void;
}

export function useDocumentExtraction(): UseDocumentExtractionReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [resultKk, setResultKk] = useState<KkResult | null>(null);
  const [resultAkta, setResultAkta] = useState<AktaResult | null>(null);
  const [modelUsedKk, setModelUsedKk] = useState("");
  const [modelUsedAkta, setModelUsedAkta] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const reset = useCallback(() => {
    setResultKk(null);
    setResultAkta(null);
    setModelUsedKk("");
    setModelUsedAkta("");
    setErrorMsg("");
  }, []);

  const restore = useCallback(
    (data: RestoreExtractionData) => {
      setResultKk(data.kk);
      setResultAkta(data.akta);
      setModelUsedKk(data.modelUsedKk || "");
      setModelUsedAkta(data.modelUsedAkta || "");
      setErrorMsg("");
    },
    []
  );

  const extract = useCallback(
    async (files: File[]) => {
      if (
        files.length === 0 ||
        isExtracting
      ) {
        return;
      }

      // Jangan reset hasil lama.
      setErrorMsg("");
      setIsExtracting(true);

      try {
        const results =
          await Promise.allSettled(
            files.map((file) =>
              extractDocument(file)
            )
          );

        const errors: string[] = [];

        results.forEach(
          (result, index) => {
            const file =
              files[index];

            if (
              result.status ===
              "fulfilled"
            ) {
              const data =
                result.value;

              if (
                data.type === "kk"
              ) {
                setResultKk(
                  data.data
                );

                setModelUsedKk(
                  data.model_used ||
                    DEFAULT_MODEL_NAME
                );
              }

              if (
                data.type === "akta"
              ) {
                setResultAkta(
                  data.data
                );

                setModelUsedAkta(
                  data.model_used ||
                    DEFAULT_MODEL_NAME
                );
              }

              return;
            }

            const error =
              result.reason instanceof
              Error
                ? result.reason.message
                : DEFAULT_ERROR_MESSAGE;

            errors.push(
              `${file.name}: ${error}`
            );
          }
        );

        if (
          errors.length > 0
        ) {
          setErrorMsg(
            errors.join("\n")
          );
        }
      } finally {
        setIsExtracting(false);
      }
    },
    [isExtracting]
  );

  return {
    isExtracting,
    resultKk,
    resultAkta,
    modelUsedKk,
    modelUsedAkta,
    errorMsg,
    extract,
    restore,
    reset,
  };
}