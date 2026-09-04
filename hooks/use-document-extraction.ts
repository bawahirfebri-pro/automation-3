import { useState } from "react";

import {
  extractDocument,
} from "@/lib/extraction/document-extraction";

import type {
  AktaResult,
} from "@/types/akta";

import type {
  KkResult,
} from "@/types/kk";

const DEFAULT_MODEL_NAME =
  "Tidak diketahui";

const DEFAULT_ERROR_MESSAGE =
  "Terjadi kesalahan saat memproses dokumen.";

export type DataSource =
  | "none"
  | "extraction"
  | "sheet";

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

interface RestoreExtractionData {
  kk: KkResult | null;
  akta: AktaResult | null;
  modelUsedKk?: string;
  modelUsedAkta?: string;
  kkSource?: DataSource;
  aktaSource?: DataSource;
}

interface UseDocumentExtractionReturn {
  isExtracting: boolean;
  resultKk: KkResult | null;
  resultAkta: AktaResult | null;
  modelUsedKk: string;
  modelUsedAkta: string;
  kkSource: DataSource;
  aktaSource: DataSource;
  processedFileKeys: string[];
  failedFileKeys: string[];
  documentTypes: Record<
    string,
    ExtractedDocumentType
  >;
  fileExtractions: Record<
    string,
    FileExtractionState
  >;
  errorMsg: string;
  extract: (
    files: File[]
  ) => Promise<void>;
  removeFileExtraction: (
    file: File
  ) => void;
  restore: (
    data: RestoreExtractionData
  ) => void;
  reset: () => void;
}

export function getDocumentFileKey(
  file: File
): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function useDocumentExtraction():
  UseDocumentExtractionReturn {
  const [
    isExtracting,
    setIsExtracting,
  ] = useState(false);

  const [
    resultKk,
    setResultKk,
  ] =
    useState<KkResult | null>(
      null
    );

  const [
    resultAkta,
    setResultAkta,
  ] =
    useState<AktaResult | null>(
      null
    );

  const [
    modelUsedKk,
    setModelUsedKk,
  ] = useState("");

  const [
    modelUsedAkta,
    setModelUsedAkta,
  ] = useState("");

  const [
    kkSource,
    setKkSource,
  ] =
    useState<DataSource>(
      "none"
    );

  const [
    aktaSource,
    setAktaSource,
  ] =
    useState<DataSource>(
      "none"
    );

  const [
    processedFileKeys,
    setProcessedFileKeys,
  ] =
    useState<string[]>([]);

  const [
    failedFileKeys,
    setFailedFileKeys,
  ] =
    useState<string[]>([]);

  const [
    documentTypes,
    setDocumentTypes,
  ] = useState<
    Record<
      string,
      ExtractedDocumentType
    >
  >({});

  const [
    fileExtractions,
    setFileExtractions,
  ] = useState<
    Record<
      string,
      FileExtractionState
    >
  >({});

  const [
    errorMsg,
    setErrorMsg,
  ] = useState("");

  const rebuildAggregate = (
    extractions: Record<
      string,
      FileExtractionState
    >
  ) => {
    const values =
      Object.values(
        extractions
      );

    const latestKk = [
      ...values,
    ]
      .reverse()
      .find(
        (item) =>
          item.kk
      );

    const latestAkta = [
      ...values,
    ]
      .reverse()
      .find(
        (item) =>
          item.akta
      );

    setResultKk(
      latestKk?.kk ||
      null
    );

    setResultAkta(
      latestAkta?.akta ||
      null
    );

    setModelUsedKk(
      latestKk
        ?.modelUsedKk ||
      ""
    );

    setModelUsedAkta(
      latestAkta
        ?.modelUsedAkta ||
      ""
    );

    setKkSource(
      latestKk?.kk
        ? "extraction"
        : "none"
    );

    setAktaSource(
      latestAkta?.akta
        ? "extraction"
        : "none"
    );
  };

  const reset = () => {
    setResultKk(null);
    setResultAkta(null);

    setModelUsedKk("");
    setModelUsedAkta("");

    setKkSource("none");
    setAktaSource("none");

    setProcessedFileKeys(
      []
    );

    setFailedFileKeys(
      []
    );

    setDocumentTypes(
      {}
    );

    setFileExtractions(
      {}
    );

    setErrorMsg("");
  };

  const restore = (
    data:
      RestoreExtractionData
  ) => {
    setResultKk(
      data.kk
    );

    setResultAkta(
      data.akta
    );

    setModelUsedKk(
      data.modelUsedKk ||
      ""
    );

    setModelUsedAkta(
      data.modelUsedAkta ||
      ""
    );

    setKkSource(
      data.kk
        ? data.kkSource ||
          "sheet"
        : "none"
    );

    setAktaSource(
      data.akta
        ? data.aktaSource ||
          "sheet"
        : "none"
    );

    setErrorMsg("");
  };

  const extract = async (
    files: File[]
  ) => {
    if (
      files.length === 0 ||
      isExtracting
    ) {
      return;
    }

    setErrorMsg("");
    setIsExtracting(true);

    try {
      const results =
        await Promise.allSettled(
          files.map(
            (file) =>
              extractDocument(
                file
              )
          )
        );

      const errors:
        string[] = [];

      const attemptedKeys:
        string[] = [];

      const failedKeys:
        string[] = [];

      const extractedTypes:
        Record<
          string,
          ExtractedDocumentType
        > = {};

      const newExtractions:
        Record<
          string,
          FileExtractionState
        > = {};

      results.forEach(
        (
          result,
          index
        ) => {
          const file =
            files[
              index
            ];

          const fileKey =
            getDocumentFileKey(
              file
            );

          attemptedKeys.push(
            fileKey
          );

          if (
            result.status ===
            "rejected"
          ) {
            failedKeys.push(
              fileKey
            );

            const message =
              result.reason
                instanceof Error
                ? result
                    .reason
                    .message
                : DEFAULT_ERROR_MESSAGE;

            errors.push(
              `${file.name}: ${message}`
            );

            return;
          }

          const data =
            result.value;

          if (
            data.type ===
            "kk"
          ) {
            extractedTypes[
              fileKey
            ] = "kk";

            newExtractions[
              fileKey
            ] = {
              type: "kk",
              kk:
                data.data,
              akta: null,
              modelUsedKk:
                data
                  .model_used ||
                DEFAULT_MODEL_NAME,
              modelUsedAkta:
                "",
            };

            return;
          }

          if (
            data.type ===
            "akta"
          ) {
            extractedTypes[
              fileKey
            ] = "akta";

            newExtractions[
              fileKey
            ] = {
              type:
                "akta",
              kk: null,
              akta:
                data.data,
              modelUsedKk:
                "",
              modelUsedAkta:
                data
                  .model_used ||
                DEFAULT_MODEL_NAME,
            };

            return;
          }

          if (
            data.type ===
            "both"
          ) {
            extractedTypes[
              fileKey
            ] = "both";

            newExtractions[
              fileKey
            ] = {
              type:
                "both",
              kk:
                data
                  .data
                  .kk,
              akta:
                data
                  .data
                  .akta,
              modelUsedKk:
                data
                  .model_used
                  ?.kk ||
                DEFAULT_MODEL_NAME,
              modelUsedAkta:
                data
                  .model_used
                  ?.akta ||
                DEFAULT_MODEL_NAME,
            };

            return;
          }

          /*
           * Dokumen berhasil
           * diproses tetapi
           * bukan KK / Akta.
           */
          extractedTypes[
            fileKey
          ] = "unknown";

          newExtractions[
            fileKey
          ] = {
            type:
              "unknown",
            kk: null,
            akta: null,
            modelUsedKk:
              "",
            modelUsedAkta:
              "",
          };
        }
      );

      setProcessedFileKeys(
        (previous) => {
          const next =
            new Set(
              previous
            );

          attemptedKeys.forEach(
            (
              fileKey
            ) => {
              next.add(
                fileKey
              );
            }
          );

          return [
            ...next,
          ];
        }
      );

      setFailedFileKeys(
        (previous) => {
          const next =
            new Set(
              previous
            );

          attemptedKeys.forEach(
            (
              fileKey
            ) => {
              next.delete(
                fileKey
              );
            }
          );

          failedKeys.forEach(
            (
              fileKey
            ) => {
              next.add(
                fileKey
              );
            }
          );

          return [
            ...next,
          ];
        }
      );

      setDocumentTypes(
        (previous) => ({
          ...previous,
          ...extractedTypes,
        })
      );

      setFileExtractions(
        (previous) => {
          const next = {
            ...previous,
            ...newExtractions,
          };

          rebuildAggregate(
            next
          );

          return next;
        }
      );

      if (
        errors.length >
        0
      ) {
        setErrorMsg(
          errors.join(
            "\n"
          )
        );
      }
    } finally {
      setIsExtracting(
        false
      );
    }
  };

  const removeFileExtraction =
    (
      file: File
    ) => {
      const fileKey =
        getDocumentFileKey(
          file
        );

      setProcessedFileKeys(
        (previous) =>
          previous.filter(
            (key) =>
              key !==
              fileKey
          )
      );

      setFailedFileKeys(
        (previous) =>
          previous.filter(
            (key) =>
              key !==
              fileKey
          )
      );

      setDocumentTypes(
        (previous) => {
          const next = {
            ...previous,
          };

          delete next[
            fileKey
          ];

          return next;
        }
      );

      setFileExtractions(
        (previous) => {
          const next = {
            ...previous,
          };

          delete next[
            fileKey
          ];

          rebuildAggregate(
            next
          );

          return next;
        }
      );
    };

  return {
    isExtracting,

    resultKk,
    resultAkta,

    modelUsedKk,
    modelUsedAkta,

    kkSource,
    aktaSource,

    processedFileKeys,
    failedFileKeys,

    documentTypes,
    fileExtractions,

    errorMsg,

    extract,
    removeFileExtraction,
    restore,
    reset,
  };
}