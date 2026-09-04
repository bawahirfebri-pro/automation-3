"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import UploadSection from "@/components/upload-section";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import DashboardContent from "@/components/dashboard/dashboard-content";
import StudentPanel from "@/components/dashboard/student-panel";
import KkSummary from "@/components/dashboard/kk-summary";
import KkMembers from "@/components/dashboard/kk-members";
import AktaPanel from "@/components/dashboard/akta-panel";
import { extractStudentNameFromFilename } from "@/lib/document-name";
import { createCanonicalFileName } from "@/lib/canonical-file-name";
import { createFileStudentMatch, matchFileStudentLocally, type FileStudentMatch, } from "@/lib/file-student-matcher";
import { normalizeStudentName } from "@/lib/student-matcher";
import { getStudentDetail, matchStudentName } from "@/lib/api/students";
import { getDocumentFileKey, useDocumentExtraction, } from "@/hooks/use-document-extraction";
import { useDocumentFiles } from "@/hooks/use-document-files";
import { useExtractionHistory } from "@/hooks/use-extraction-history";
import { useStudents } from "@/hooks/use-students";
import { useSaveToSheet } from "@/hooks/use-save-to-sheet";
import type { StudentRecord } from "@/types/student";
import type { DocumentDisplayFile } from "@/types/document-file";
import type { KkResult } from "@/types/kk";
import type { AktaResult } from "@/types/akta";
import {
  getPdfPageCount,
  mergePdfParts,
  splitPdfByPage,
} from "@/lib/pdf-splitter";
import {
  getKkPageIdentity,
} from "@/lib/api/kk-page-identity";
import {
  groupKkPages,
  type KkPageIdentityResult,
} from "@/lib/kk-page-grouper";
type SaveFeedbackStatus = "idle" | "success" | "error";
type AiTaskOutcomeStatus = "matched" | "rejected" | "failed";
interface AiTaskOutcome {
  status: AiTaskOutcomeStatus;
  payloadKey: string;
}
type ManualResolutionValue = {
  status: "matched";
  rowIndex: number;
} | {
  status: "not-enrolled";
  rowIndex: null;
};
interface ManualResolutionTask {
  taskKey: string;
  detectedName: string;
  reason: "duplicate-name" | "ai-ambiguous";
  candidates: {
    rowIndex: number;
    nama: string;
    score: number;
  }[];
}

interface StudentDetailBaseline {
  rowIndex: number;
  kk: KkResult | null;
  akta: AktaResult | null;
  modelUsedKk: string;
  modelUsedAkta: string;
}
function getNamedStudentRow(file: File, students: StudentRecord[]): number | null {
  const match = file.name.match(/^(.*?)[\s_-]+(?:kk|kartu[\s_-]*keluarga|akta(?:[\s_-]*kelahiran)?)\.pdf$/i);
  if (!match) return null;
  const key = normalizeStudentName(match[1].replace(/[_-]+/g, " ").trim());
  if (!key) return null;
  const exact = students.filter((student) => normalizeStudentName(student.nama) === key);
  if (exact.length === 1) return exact[0].rowIndex;
  const prefix = students.filter((student) => normalizeStudentName(student.nama).startsWith(`${key} `));
  return prefix.length === 1 ? prefix[0].rowIndex : null;
}

function getExtractedDocumentName(
  fileKey: string,
  documentType:
    | "kk"
    | "akta"
    | "both"
    | "unknown"
    | null,
  fileExtractions:
    Record<string, any>
): string {
  const extraction = fileExtractions[fileKey];
  if (!extraction || !documentType) return "";

  if (documentType === "akta" || documentType === "both") {
    const nama = extraction.akta?.nama_anak?.trim() ?? "";
    return nama ? toNameCase(nama) : "";
  }

  return "";
}

function toNameCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase());
}
async function getKkPageIdentityWithTimeout(
  file: File,
  timeoutMs = 15000
) {
  return Promise.race([
    getKkPageIdentity(file),

    new Promise<never>(
      (_, reject) => {
        window.setTimeout(
          () => {
            reject(
              new Error(
                `Timeout membaca identitas ${file.name}`
              )
            );
          },
          timeoutMs
        );
      }
    ),
  ]);
}

function isValidKkNumber(
  value: string
): boolean {
  return /^\d{16}$/.test(
    value.replace(/\D/g, "")
  );
}

function dedupeDocumentFiles(
  inputFiles: File[]
): File[] {
  const seen =
    new Set<string>();

  return inputFiles.filter(
    (file) => {
      const fileKey =
        getDocumentFileKey(file);

      if (seen.has(fileKey)) {
        return false;
      }

      seen.add(fileKey);
      return true;
    }
  );
}

function getNikFromPathname(
  pathname: string
): string {
  const match =
    pathname.match(
      /^\/(\d{16})\/?$/
    );

  return match?.[1] ?? "";
}

function setStudentUrl(
  nik: string | null | undefined
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const normalizedNik =
    (nik ?? "")
      .replace(/\D/g, "");

  if (
    !/^\d{16}$/.test(
      normalizedNik
    )
  ) {
    if (
      window.location.pathname !==
      "/"
    ) {
      window.history.pushState(
        null,
        "",
        "/"
      );
    }

    return;
  }

  const nextPath =
    `/${normalizedNik}`;

  if (
    window.location.pathname ===
    nextPath
  ) {
    return;
  }

  window.history.pushState(
    null,
    "",
    nextPath
  );
}

function clearStudentUrl() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  if (
    window.location.pathname ===
    "/"
  ) {
    return;
  }

  window.history.pushState(
    null,
    "",
    "/"
  );
}
export default function Home() {
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [selectedStudentRow, setSelectedStudentRow] = useState<number | null>(null);
  const [studentDetailBaseline, setStudentDetailBaseline] = useState<StudentDetailBaseline | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<Record<string, SaveFeedbackStatus>>({});
  const [fileStudentMatches, setFileStudentMatches] = useState<Record<string, FileStudentMatch>>({});
  const [aiMatchingTaskKeys, setAiMatchingTaskKeys] = useState<string[]>([]);
  const [aiTaskOutcomes, setAiTaskOutcomes] = useState<Record<string, AiTaskOutcome>>({});
  const [manualTaskResolutions, setManualTaskResolutions] = useState<Record<string, ManualResolutionValue>>({});
  const [detectedFileKeys, setDetectedFileKeys] = useState<string[]>([]);
  const [detectedStudentRowIndexes, setDetectedStudentRowIndexes] = useState<number[]>([]);
  const [fileStudentScopes, setFileStudentScopes] = useState<Record<string, number[]>>({});
  const [pendingUploadFileKeys, setPendingUploadFileKeys] = useState<string[]>([]);
  const studentRequestIdRef = useRef(0);
  const baselineRequestIdRef = useRef(0);
  const restoredNikRef = useRef("");
  const saveFeedbackTimersRef = useRef<Record<string, number>>({});
  const aiTaskPayloadKeysRef = useRef<Record<string, string>>({});
  const aiTaskRequestIdsRef = useRef<Record<string, number>>({});
  const { isExtracting, resultKk, resultAkta, modelUsedKk, modelUsedAkta, processedFileKeys, failedFileKeys, documentTypes, fileExtractions, errorMsg, extract, removeFileExtraction, restore, reset, } = useDocumentExtraction();
  const { history, addOrUpdateHistory, markAsSaved } = useExtractionHistory();
  const { students, loadingStudents, studentError, refreshStudents } = useStudents();
  const { saving: savingAll, save, saveMany } = useSaveToSheet();
  const { files, handleRemoveFile, clearFiles, replaceFiles } = useDocumentFiles();
  const historyMap = useMemo(() => new Map(history.map((item) => [item.id, item])), [history]);
  const historyRef = useRef(history);
  const [filenameMatchIssues, setFilenameMatchIssues] = useState<
    Record<
      string,
      {
        status: "not-found";
        detectedName: string;
      }
    >
  >({});
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  const fileMatchPlans = useMemo(() => {
    return Object.fromEntries(Object.entries(fileExtractions).map(([fileKey, extraction]) => [
      fileKey,
      matchFileStudentLocally(extraction, students),
    ]));
  }, [fileExtractions, students]);

  const currentFileKeys = useMemo(() => files.map((file) => getDocumentFileKey(file)), [files]);
  const currentFileKeySet = useMemo(() => new Set(currentFileKeys), [currentFileKeys]);
  useEffect(() => {
    const processedSet = new Set(processedFileKeys);

    setFilenameMatchIssues((previous) => {
      const next = { ...previous };
      let changed = false;

      currentFileKeys.forEach((fileKey) => {
        if (!processedSet.has(fileKey)) return;

        const extraction = fileExtractions[fileKey];
        if (!extraction) return;

        const detectedName =
          extraction.akta?.nama_anak?.trim() ?? "";

        if (!detectedName) return;

        const normalizedDetectedName =
          normalizeStudentName(detectedName);

        const exactStudents = students.filter(
          (student) =>
            normalizeStudentName(student.nama) ===
            normalizedDetectedName
        );

        const prefixStudents =
          exactStudents.length === 0
            ? students.filter((student) =>
              normalizeStudentName(student.nama).startsWith(
                `${normalizedDetectedName} `
              )
            )
            : [];

        const registered =
          exactStudents.length === 1 ||
          prefixStudents.length === 1;

        if (!registered) {
          const currentIssue = next[fileKey];

          if (
            currentIssue?.status !== "not-found" ||
            normalizeStudentName(currentIssue.detectedName) !==
            normalizedDetectedName
          ) {
            next[fileKey] = {
              status: "not-found",
              detectedName: toNameCase(detectedName),
            };

            changed = true;
          }

          return;
        }

        // Kalau sebelumnya pernah dianggap not-found tetapi
        // hasil extraction ternyata cocok dengan murid terdaftar,
        // hapus issue tersebut.
        if (next[fileKey]) {
          delete next[fileKey];
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [
    currentFileKeys,
    processedFileKeys,
    fileExtractions,
    students,
  ]);
  useEffect(() => {
    if (files.length <= 1) return;

    const processedSet = new Set(processedFileKeys);

    const candidates = files
      .map((file) => {
        const fileKey = getDocumentFileKey(file);
        const extraction = fileExtractions[fileKey];
        const issue = filenameMatchIssues[fileKey];

        if (!processedSet.has(fileKey)) return null;
        if (issue?.status !== "not-found") return null;
        if (!extraction?.akta) return null;

        const extractedName =
          extraction.akta.nama_anak?.trim() ?? "";

        if (!extractedName) return null;

        const canonicalName =
          createCanonicalFileName(
            toNameCase(extractedName),
            "akta"
          );

        return {
          file,
          fileKey,
          canonicalName,
          identityKey:
            `${normalizeStudentName(extractedName)}::akta`,
        };
      })
      .filter(
        (
          item
        ): item is {
          file: File;
          fileKey: string;
          canonicalName: string;
          identityKey: string;
        } => Boolean(item)
      );

    if (candidates.length <= 1) return;

    const groups = new Map<
      string,
      typeof candidates
    >();

    candidates.forEach((candidate) => {
      const group =
        groups.get(candidate.identityKey) ?? [];

      group.push(candidate);
      groups.set(candidate.identityKey, group);
    });

    const duplicateKeys = new Set<string>();

    groups.forEach((group) => {
      if (group.length <= 1) return;

      /*
       * Prioritas file yang dipertahankan:
       * 1. Nama file asli sudah canonical.
       * 2. Jika tidak ada, file pertama.
       */
      const keeper =
        group.find(
          (item) =>
            item.file.name.toLowerCase() ===
            item.canonicalName.toLowerCase()
        ) ?? group[0];

      group.forEach((item) => {
        if (item.fileKey !== keeper.fileKey) {
          duplicateKeys.add(item.fileKey);
        }
      });
    });

    if (duplicateKeys.size === 0) return;

    const duplicateFiles = files.filter((file) =>
      duplicateKeys.has(getDocumentFileKey(file))
    );

    duplicateFiles.forEach((file) => {
      const fileKey = getDocumentFileKey(file);

      invalidateAiTasksForFile(fileKey);
      removeFileExtraction(file);
    });

    setFileStudentMatches((previous) => {
      const next = { ...previous };

      duplicateKeys.forEach((fileKey) => {
        delete next[fileKey];
      });

      return next;
    });

    setFileStudentScopes((previous) => {
      const next = { ...previous };

      duplicateKeys.forEach((fileKey) => {
        delete next[fileKey];
      });

      return next;
    });

    setFilenameMatchIssues((previous) => {
      const next = { ...previous };

      duplicateKeys.forEach((fileKey) => {
        delete next[fileKey];
      });

      return next;
    });

    setPendingUploadFileKeys((previous) =>
      previous.filter(
        (fileKey) => !duplicateKeys.has(fileKey)
      )
    );

    setDetectedFileKeys((previous) =>
      previous.filter(
        (fileKey) => !duplicateKeys.has(fileKey)
      )
    );

    replaceFiles(
      files.filter(
        (file) =>
          !duplicateKeys.has(
            getDocumentFileKey(file)
          )
      )
    );
  }, [
    files,
    processedFileKeys,
    fileExtractions,
    filenameMatchIssues,
    replaceFiles,
    removeFileExtraction,
  ]);

  useEffect(() => {
    setFileStudentMatches((previous) => {
      const next: Record<string, FileStudentMatch> = {};

      currentFileKeys.forEach((fileKey) => {
        const previousMatch = previous[fileKey];

        if (previousMatch) {
          next[fileKey] = previousMatch;
        }
      });

      Object.entries(fileMatchPlans).forEach(([fileKey, plan]) => {
        if (!currentFileKeySet.has(fileKey)) {
          return;
        }

        const previousMatch = previous[fileKey];
        const previousRows =
          previousMatch?.rowIndexes ?? [];

        if (
          previousMatch?.source === "exact" ||
          previousMatch?.source === "ai" ||
          previousMatch?.source === "manual"
        ) {
          next[fileKey] =
            createFileStudentMatch(
              [
                ...plan.match.rowIndexes,
                ...previousRows,
              ],
              previousMatch.source
            );

          return;
        }

        next[fileKey] = plan.match;
      });

      return next;
    });
  }, [
    fileMatchPlans,
    currentFileKeys,
    currentFileKeySet,
  ]);
  useEffect(() => {
    Object.entries(fileMatchPlans).forEach(([fileKey, plan]) => {
      if (!currentFileKeySet.has(fileKey)) return;
      plan.pendingAi?.tasks.forEach((task) => {
        const requestKey = `${fileKey}::${task.taskKey}`;
        const payloadKey = JSON.stringify({
          detectedNames: task.detectedNames,
          candidates: task.candidates,
        });
        const existingOutcome = aiTaskOutcomes[requestKey];
        if (existingOutcome?.payloadKey === payloadKey &&
          existingOutcome.status !== "failed") {
          return;
        }
        if (aiTaskPayloadKeysRef.current[requestKey] === payloadKey)
          return;
        aiTaskPayloadKeysRef.current[requestKey] = payloadKey;
        const requestId = (aiTaskRequestIdsRef.current[requestKey] || 0) + 1;
        aiTaskRequestIdsRef.current[requestKey] = requestId;
        setAiMatchingTaskKeys((previous) => previous.includes(requestKey)
          ? previous
          : [...previous, requestKey]);
        void matchStudentName(task.detectedNames, task.candidates)
          .then((result) => {
            if (aiTaskRequestIdsRef.current[requestKey] !== requestId)
              return;
            if (!result.matched || result.rowIndex === null) {
              setAiTaskOutcomes((previous) => ({
                ...previous,
                [requestKey]: {
                  status: "rejected",
                  payloadKey,
                },
              }));
              return;
            }
            const matchedRowIndex = result.rowIndex;
            if (!task.candidates.some((candidate) => candidate.rowIndex === matchedRowIndex) ||
              !students.some((student) => student.rowIndex === matchedRowIndex)) {
              setAiTaskOutcomes((previous) => ({
                ...previous,
                [requestKey]: {
                  status: "failed",
                  payloadKey,
                },
              }));
              return;
            }
            let collision = false;
            setFileStudentMatches((previous) => {
              const previousMatch = previous[fileKey];
              const previousRows = previousMatch?.rowIndexes ?? [];
              const baseRows = fileMatchPlans[fileKey]?.match.rowIndexes ?? [];
              if (previousRows.includes(matchedRowIndex)) {
                collision = true;
                return previous;
              }
              const source = previousMatch?.source === "manual"
                ? "manual"
                : "ai";
              return {
                ...previous,
                [fileKey]: createFileStudentMatch([...baseRows, ...previousRows, matchedRowIndex], source),
              };
            });
            setAiTaskOutcomes((previous) => ({
              ...previous,
              [requestKey]: {
                status: collision ? "failed" : "matched",
                payloadKey,
              },
            }));
          })
          .catch((error) => {
            if (aiTaskRequestIdsRef.current[requestKey] !== requestId)
              return;
            console.error(`[AI KK Member Match] ${requestKey}`, error);
            setAiTaskOutcomes((previous) => ({
              ...previous,
              [requestKey]: {
                status: "failed",
                payloadKey,
              },
            }));
          })
          .finally(() => {
            if (aiTaskRequestIdsRef.current[requestKey] !== requestId)
              return;
            setAiMatchingTaskKeys((previous) => previous.filter((key) => key !== requestKey));
          });
      });
    });
  }, [
    fileMatchPlans,
    fileStudentMatches,
    students,
    aiTaskOutcomes,
    currentFileKeySet,
  ]);
  const aiMatchingFileKeys = useMemo(() => {
    return [
      ...new Set(aiMatchingTaskKeys.map((taskKey) => taskKey.split("::")[0])),
    ];
  }, [aiMatchingTaskKeys]);
  const isAiMatching = aiMatchingTaskKeys.length > 0;
  const manualTasksByFile = useMemo(() => {
    return Object.fromEntries(currentFileKeys.map((fileKey) => {
      const plan = fileMatchPlans[fileKey];
      if (!plan) {
        return [fileKey, []];
      }
      const tasks: ManualResolutionTask[] = plan.manualTasks.map((task) => ({
        taskKey: task.taskKey,
        detectedName: task.detectedName,
        reason: "duplicate-name",
        candidates: task.candidates,
      }));
      plan.pendingAi?.tasks.forEach((task) => {
        const requestKey = `${fileKey}::${task.taskKey}`;
        const payloadKey = JSON.stringify({
          detectedNames: task.detectedNames,
          candidates: task.candidates,
        });
        const outcome = aiTaskOutcomes[requestKey];
        if (outcome?.payloadKey !== payloadKey ||
          (outcome.status !== "rejected" &&
            outcome.status !== "failed")) {
          return;
        }
        tasks.push({
          taskKey: task.taskKey,
          detectedName: task.detectedNames[0] ||
            "Nama tidak diketahui",
          reason: "ai-ambiguous",
          candidates: task.candidates,
        });
      });
      return [fileKey, tasks];
    })) as Record<string, ManualResolutionTask[]>;
  }, [
    currentFileKeys,
    fileMatchPlans,
    aiTaskOutcomes,
  ]);
  const fileResolutionComplete = useMemo(() => {
    return Object.fromEntries(
      currentFileKeys.map((fileKey) => {
        const plan = fileMatchPlans[fileKey];

        const currentMatch =
          fileStudentMatches[fileKey];

        const trustedFilenameMatch =
          currentMatch?.source === "exact" &&
          currentMatch.rowIndexes.length > 0;

        // Filename sudah berhasil menentukan satu siswa secara unik.
        // Setelah extraction file tersedia, tidak perlu menunggu
        // content matcher menemukan kandidat lagi.
        if (
          trustedFilenameMatch &&
          Boolean(fileExtractions[fileKey]) &&
          !aiMatchingFileKeys.includes(fileKey)
        ) {
          return [fileKey, true];
        }

        if (
          !plan ||
          plan.resolution.totalCandidates === 0
        ) {
          return [fileKey, false];
        }

        let accounted =
          plan.resolution.locallyMatched +
          plan.resolution.locallyNotEnrolled;

        plan.manualTasks.forEach((task) => {
          const resolution =
            manualTaskResolutions[
            `${fileKey}::${task.taskKey}`
            ];

          if (resolution) {
            accounted += 1;
          }
        });

        plan.pendingAi?.tasks.forEach((task) => {
          const requestKey =
            `${fileKey}::${task.taskKey}`;

          const resolution =
            manualTaskResolutions[requestKey];

          if (resolution) {
            accounted += 1;
            return;
          }

          const payloadKey = JSON.stringify({
            detectedNames:
              task.detectedNames,
            candidates:
              task.candidates,
          });

          const outcome =
            aiTaskOutcomes[requestKey];

          if (
            outcome?.payloadKey === payloadKey &&
            outcome.status === "matched"
          ) {
            accounted += 1;
          }
        });

        return [
          fileKey,
          !aiMatchingFileKeys.includes(fileKey) &&
          accounted >=
          plan.resolution.totalCandidates,
        ];
      })
    ) as Record<string, boolean>;
  }, [
    currentFileKeys,
    fileMatchPlans,
    fileStudentMatches,
    fileExtractions,
    manualTaskResolutions,
    aiTaskOutcomes,
    aiMatchingFileKeys,
  ]);
  const rawRowsByFile = useMemo(() => Object.fromEntries(
    currentFileKeys.map((fileKey) => [
      fileKey,
      fileStudentMatches[fileKey]?.rowIndexes ?? [],
    ])
  ) as Record<string, number[]>, [
    currentFileKeys,
    fileStudentMatches,
  ]);

  const scopedRowsByFile = useMemo(() => Object.fromEntries(
    currentFileKeys.map((fileKey) => {
      const scopedRows = fileStudentScopes[fileKey];

      return [
        fileKey,
        scopedRows?.length
          ? scopedRows
          : rawRowsByFile[fileKey] ?? [],
      ];
    })
  ) as Record<string, number[]>, [
    currentFileKeys,
    fileStudentScopes,
    rawRowsByFile,
  ]);

  useEffect(() => {
    if (
      currentFileKeys.length === 0
    ) {
      return;
    }

    const kkFiles =
      files.filter((file) => {
        const fileKey =
          getDocumentFileKey(file);

        return Boolean(
          fileExtractions[fileKey]?.kk
        );
      });

    if (kkFiles.length === 0) {
      return;
    }

    console.group(
      "========== [KK UNIT MATCH DEBUG] =========="
    );

    kkFiles.forEach((file) => {
      const fileKey =
        getDocumentFileKey(file);

      const rawRows =
        fileStudentMatches[
          fileKey
        ]?.rowIndexes ?? [];

      const scopedRows =
        scopedRowsByFile[
        fileKey
        ] ?? [];

      const rawStudents =
        rawRows
          .map(
            (rowIndex) =>
              students.find(
                (student) =>
                  student.rowIndex ===
                  rowIndex
              )?.nama
          )
          .filter(Boolean);

      const scopedStudents =
        scopedRows
          .map(
            (rowIndex) =>
              students.find(
                (student) =>
                  student.rowIndex ===
                  rowIndex
              )?.nama
          )
          .filter(Boolean);

      console.log({
        file:
          file.name,

        fileKey,

        rawRows,

        rawStudents,

        scopedRows,

        scopedStudents,
      });
    });

    console.groupEnd();
  }, [
    files,
    currentFileKeys,
    fileExtractions,
    fileStudentMatches,
    scopedRowsByFile,
    students,
  ]);

  useEffect(() => {
    console.group("========== [SESSION DEBUG] ==========");

    console.log(
      "[FILES]",
      files.map((file) => ({
        name: file.name,
        key: getDocumentFileKey(file),
      }))
    );

    console.log(
      "[CURRENT FILE KEYS]",
      currentFileKeys
    );

    console.log(
      "[PENDING UPLOAD KEYS]",
      pendingUploadFileKeys
    );

    console.log(
      "[DOCUMENT TYPES]",
      currentFileKeys.map((fileKey) => ({
        fileKey,
        type: documentTypes[fileKey] ?? null,
      }))
    );

    console.log(
      "[EXTRACTIONS]",
      currentFileKeys.map((fileKey) => ({
        fileKey,
        hasKk: Boolean(fileExtractions[fileKey]?.kk),
        hasAkta: Boolean(fileExtractions[fileKey]?.akta),
      }))
    );

    console.log(
      "[RAW ROWS]",
      currentFileKeys.map((fileKey) => ({
        fileKey,
        rows: rawRowsByFile[fileKey] ?? [],
      }))
    );

    console.log(
      "[SCOPED ROWS]",
      currentFileKeys.map((fileKey) => ({
        fileKey,
        rows: scopedRowsByFile[fileKey] ?? [],
      }))
    );

    console.groupEnd();
  }, [
    files,
    currentFileKeys,
    pendingUploadFileKeys,
    documentTypes,
    fileExtractions,
    rawRowsByFile,
    scopedRowsByFile,
  ]);

  const currentKkFileKeys = useMemo(() => currentFileKeys.filter((fileKey) => Boolean(fileExtractions[fileKey]?.kk)), [currentFileKeys, fileExtractions]);
  const currentAktaFileKeys = useMemo(() => currentFileKeys.filter((fileKey) => Boolean(fileExtractions[fileKey]?.akta)), [currentFileKeys, fileExtractions]);
  const sessionStudentRowIndexes = useMemo(
    () => [...new Set(currentFileKeys.flatMap((fileKey) => scopedRowsByFile[fileKey] ?? []))],
    [currentFileKeys, scopedRowsByFile]
  );
  useEffect(() => {
    if (detectedFileKeys.length === 0) {
      setDetectedStudentRowIndexes([]);
      return;
    }

    const activeDetectedFileKeys =
      detectedFileKeys.filter((fileKey) =>
        currentFileKeySet.has(fileKey)
      );

    const rows = [
      ...new Set(
        activeDetectedFileKeys.flatMap(
          (fileKey) =>
            scopedRowsByFile[fileKey] ?? []
        )
      ),
    ];

    setDetectedStudentRowIndexes((previous) => {
      if (
        previous.length === rows.length &&
        previous.every(
          (rowIndex, index) =>
            rowIndex === rows[index]
        )
      ) {
        return previous;
      }

      return rows;
    });
  }, [
    detectedFileKeys,
    currentFileKeySet,
    scopedRowsByFile,
  ]);
  const kkStudentRowIndexes = useMemo(
    () => [...new Set(currentKkFileKeys.flatMap((fileKey) => scopedRowsByFile[fileKey] ?? []))],
    [currentKkFileKeys, scopedRowsByFile]
  );
  const sessionStudents = useMemo(() => {
    return sessionStudentRowIndexes
      .map((rowIndex) => students.find((student) => student.rowIndex === rowIndex))
      .filter((student): student is StudentRecord => Boolean(student));
  }, [sessionStudentRowIndexes, students]);
  const sessionConflict = useMemo(() => {
    if (files.length === 0 || isExtracting || isAiMatching)
      return "";
    if (currentKkFileKeys.length > 0) {
      if (kkStudentRowIndexes.length === 0)
        return "";
      const kkRows = new Set(kkStudentRowIndexes);
      const foreignAktaRows = [
        ...new Set(currentAktaFileKeys.flatMap((fileKey) => (scopedRowsByFile[fileKey] ?? []).filter((rowIndex) => !kkRows.has(rowIndex)))),
      ];
      if (foreignAktaRows.length === 0)
        return "";
      const names = foreignAktaRows
        .map((rowIndex) => students.find((student) => student.rowIndex === rowIndex)?.nama)
        .filter((name): name is string => Boolean(name));
      return names.length > 0
        ? `Akta terdeteksi milik siswa di luar Kartu Keluarga: ${names.join(", ")}.`
        : "Terdapat Akta yang tidak sesuai dengan siswa pada Kartu Keluarga.";
    }
    if (sessionStudentRowIndexes.length <= 1)
      return "";
    return `Dokumen terdeteksi milik siswa berbeda: ${sessionStudents
      .map((student) => student.nama)
      .join(", ")}.`;
  }, [
    files.length,
    isExtracting,
    isAiMatching,
    currentKkFileKeys,
    currentAktaFileKeys,
    kkStudentRowIndexes,
    sessionStudentRowIndexes,
    sessionStudents,
    scopedRowsByFile,
    students,
  ]);
  const primarySessionStudent = useMemo(() => {
    if (files.length > 0) {
      if (selectedStudentRow !== null) {
        const selectedInSession =
          sessionStudents.find(
            (student) =>
              student.rowIndex ===
              selectedStudentRow
          );

        if (selectedInSession) {
          return selectedInSession;
        }
      }

      return sessionStudents[0] ?? null;
    }

    if (selectedStudentRow !== null) {
      return (
        students.find(
          (student) =>
            student.rowIndex ===
            selectedStudentRow
        ) ?? null
      );
    }

    return null;
  }, [
    files.length,
    selectedStudentRow,
    sessionStudents,
    students,
  ]);
  const failedFileKeySet =
    useMemo(
      () =>
        new Set(
          failedFileKeys
        ),
      [
        failedFileKeys,
      ]
    );

  const missingExtractionFileKeys =
    useMemo(
      () =>
        currentFileKeys.filter(
          (fileKey) =>
            !fileExtractions[
            fileKey
            ] &&
            !failedFileKeySet.has(
              fileKey
            )
        ),
      [
        currentFileKeys,
        fileExtractions,
        failedFileKeySet,
      ]
    );
  const unresolvedFileKeys = useMemo(() => {
    return currentFileKeys.filter((fileKey) => {
      if (!fileExtractions[fileKey])
        return false;
      return ((fileStudentMatches[fileKey]?.rowIndexes.length ?? 0) === 0);
    });
  }, [
    currentFileKeys,
    fileExtractions,
    fileStudentMatches,
  ]);
  const duplicateDocumentMsg = useMemo(() => {
    const duplicates: string[] = [];

    for (const student of sessionStudents) {
      const kkCount =
        currentKkFileKeys.filter(
          (fileKey) =>
            (
              scopedRowsByFile[fileKey] ?? []
            ).includes(student.rowIndex)
        ).length;

      const aktaCount =
        currentAktaFileKeys.filter(
          (fileKey) =>
            (
              scopedRowsByFile[fileKey] ?? []
            ).includes(student.rowIndex)
        ).length;

      if (
        kkCount <= 1 &&
        aktaCount <= 1
      ) {
        continue;
      }

      const types: string[] = [];

      if (kkCount > 1) {
        types.push("KK");
      }

      if (aktaCount > 1) {
        types.push(
          "Akta Kelahiran"
        );
      }

      duplicates.push(
        `${student.nama} (${types.join(" dan ")})`
      );
    }

    if (duplicates.length === 0) {
      return "";
    }

    return `Terdapat dokumen duplikat untuk ${duplicates.join(
      ", "
    )}. Hapus dokumen duplikat sebelum menyimpan data.`;
  }, [
    sessionStudents,
    currentKkFileKeys,
    currentAktaFileKeys,
    scopedRowsByFile,
  ]);
  const unresolvedResolutionFileKeys = useMemo(() => currentFileKeys.filter((fileKey) => !fileResolutionComplete[fileKey]), [currentFileKeys, fileResolutionComplete]);
  const sessionReady = files.length > 0 &&
    pendingUploadFileKeys.length === 0 &&
    !isExtracting &&
    !isAiMatching &&
    !sessionConflict &&
    !duplicateDocumentMsg &&
    missingExtractionFileKeys.length === 0 &&
    unresolvedFileKeys.length === 0 &&
    unresolvedResolutionFileKeys.length === 0 &&
    sessionStudents.length > 0;
  const primaryStudentFileKeys = useMemo(() => {
    if (!primarySessionStudent) {
      return [];
    }

    return currentFileKeys.filter(
      (fileKey) =>
        (
          scopedRowsByFile[fileKey] ?? []
        ).includes(
          primarySessionStudent.rowIndex
        )
    );
  }, [
    currentFileKeys,
    scopedRowsByFile,
    primarySessionStudent,
  ]);
  const primaryStudentExtractions = useMemo(() => {
    return primaryStudentFileKeys
      .map((fileKey) => fileExtractions[fileKey])
      .filter(Boolean);
  }, [primaryStudentFileKeys, fileExtractions]);
  const sessionKkExtraction = useMemo(() => primaryStudentExtractions.find((item) => item.kk) ?? null, [primaryStudentExtractions]);
  const sessionAktaExtraction = useMemo(() => primaryStudentExtractions.find((item) => item.akta) ?? null, [primaryStudentExtractions]);
  const unregisteredExtraction = useMemo(() => {
    if (sessionStudents.length > 0) return null;

    return currentFileKeys
      .map((fileKey) => fileExtractions[fileKey])
      .filter(Boolean)
      .find((extraction) => extraction.kk || extraction.akta) ?? null;
  }, [sessionStudents.length, currentFileKeys, fileExtractions]);
  const activeStudentBaseline = useMemo(() => {
    if (!studentDetailBaseline) {
      return null;
    }

    const activeRowIndex =
      files.length > 0
        ? primarySessionStudent?.rowIndex ?? null
        : selectedStudentRow;

    if (
      activeRowIndex === null ||
      studentDetailBaseline.rowIndex !== activeRowIndex
    ) {
      return null;
    }

    return studentDetailBaseline;
  }, [
    studentDetailBaseline,
    selectedStudentRow,
    primarySessionStudent,
  ]);
  useEffect(() => {
    if (
      files.length === 0 ||
      !primarySessionStudent
    ) {
      return;
    }

    const student =
      primarySessionStudent;

    if (
      studentDetailBaseline?.rowIndex ===
      student.rowIndex
    ) {
      setLoadingStudentDetail(
        false
      );

      return;
    }

    const requestId =
      ++baselineRequestIdRef.current;

    const studentId =
      extractStudentNameFromFilename(
        `${student.nama}_KK.pdf`
      );

    const localItem =
      historyRef.current.find(
        (item) =>
          item.id === studentId
      );

    setLoadingStudentDetail(
      true
    );

    void getStudentDetail(
      student.rowIndex
    )
      .then((detail) => {
        if (
          baselineRequestIdRef.current !==
          requestId
        ) {
          return;
        }

        setStudentDetailBaseline({
          rowIndex:
            student.rowIndex,
          kk:
            localItem?.kk ??
            detail.kk,
          akta:
            localItem?.akta ??
            detail.akta,
          modelUsedKk:
            localItem?.kk
              ? localItem.modelUsedKk
              : "",
          modelUsedAkta:
            localItem?.akta
              ? localItem.modelUsedAkta
              : "",
        });
      })
      .catch((error) => {
        if (
          baselineRequestIdRef.current !==
          requestId
        ) {
          return;
        }

        console.error(
          "[Upload Baseline Detail]",
          error
        );

        if (!localItem) {
          return;
        }

        setStudentDetailBaseline({
          rowIndex:
            student.rowIndex,
          kk:
            localItem.kk,
          akta:
            localItem.akta,
          modelUsedKk:
            localItem.modelUsedKk,
          modelUsedAkta:
            localItem.modelUsedAkta,
        });
      })
      .finally(() => {
        if (
          baselineRequestIdRef.current !==
          requestId
        ) {
          return;
        }

        setLoadingStudentDetail(
          false
        );
      });
  }, [
    files.length,
    primarySessionStudent,
    studentDetailBaseline?.rowIndex,
  ]);


  const activeKk = useMemo(() => {
    if (files.length === 0) return resultKk;

    return (
      sessionKkExtraction?.kk ??
      unregisteredExtraction?.kk ??
      activeStudentBaseline?.kk ??
      null
    );
  }, [
    files.length,
    sessionKkExtraction,
    unregisteredExtraction,
    activeStudentBaseline,
    resultKk,
  ]);
  const activeAkta = useMemo(() => {
    if (files.length === 0) return resultAkta;

    return (
      sessionAktaExtraction?.akta ??
      unregisteredExtraction?.akta ??
      activeStudentBaseline?.akta ??
      null
    );
  }, [
    files.length,
    sessionAktaExtraction,
    unregisteredExtraction,
    activeStudentBaseline,
    resultAkta,
  ]);
  const activeModelUsedKk = useMemo(() => {
    if (files.length === 0) return modelUsedKk;

    return (
      sessionKkExtraction?.modelUsedKk ??
      unregisteredExtraction?.modelUsedKk ??
      activeStudentBaseline?.modelUsedKk ??
      ""
    );
  }, [
    files.length,
    sessionKkExtraction,
    unregisteredExtraction,
    activeStudentBaseline,
    modelUsedKk,
  ]);

  const activeModelUsedAkta = useMemo(() => {
    if (files.length === 0) return modelUsedAkta;

    return (
      sessionAktaExtraction?.modelUsedAkta ??
      unregisteredExtraction?.modelUsedAkta ??
      activeStudentBaseline?.modelUsedAkta ??
      ""
    );
  }, [
    files.length,
    sessionAktaExtraction,
    unregisteredExtraction,
    activeStudentBaseline,
    modelUsedAkta,
  ]);
  const activeStudentName = useMemo(() => {
    if (selectedHistoryId && files.length === 0) {
      return selectedHistoryId;
    }
    return primarySessionStudent?.nama ?? "";
  }, [
    selectedHistoryId,
    files.length,
    primarySessionStudent,
  ]);
  const displayFiles = useMemo<DocumentDisplayFile[]>(() => {
    return files.flatMap((file): DocumentDisplayFile[] => {
      const fileKey = getDocumentFileKey(file);
      const extractedDocumentType =
        documentTypes[fileKey];

      const documentType =
        extractedDocumentType ===
          "unknown"
          ? null
          : extractedDocumentType ??
          null;
      const rowIndexes = [
        ...new Set(
          scopedRowsByFile[fileKey] ?? []
        ),
      ];
      if (!documentType || rowIndexes.length === 0) {
        const extraction = fileExtractions[fileKey];
        const extractedName = getExtractedDocumentName(
          fileKey,
          documentType,
          fileExtractions
        );

        const canonicalDocumentType =
          documentType === "both"
            ? extraction?.akta
              ? "akta"
              : extraction?.kk
                ? "kk"
                : null
            : documentType;

        const displayName =
          extractedName && canonicalDocumentType
            ? createCanonicalFileName(extractedName, canonicalDocumentType)
            : file.name;

        return [{
          file,
          fileKey,
          outputKey: fileKey,
          originalName: file.name,
          displayName,
          documentType,
          renamed: displayName !== file.name,
          studentRowIndex: null,
          studentName: extractedName,
          virtual: false,
        }];
      }
      const matchedStudents = rowIndexes
        .map((rowIndex) => students.find((student) => student.rowIndex === rowIndex))
        .filter((student): student is StudentRecord => Boolean(student));
      if (matchedStudents.length === 0) {
        return [{
          file,
          fileKey,
          outputKey: fileKey,
          originalName: file.name,
          displayName: file.name,
          documentType,
          renamed: false,
          studentRowIndex: null,
          studentName: "",
          virtual: false,
        }];
      }
      return matchedStudents.map((student): DocumentDisplayFile => {
        const canonicalDocumentType =
          documentType === "both"
            ? fileExtractions[fileKey]?.akta
              ? "akta"
              : "kk"
            : documentType;

        const displayName = createCanonicalFileName(
          student.nama,
          canonicalDocumentType
        );
        return {
          file,
          fileKey,
          outputKey: `${fileKey}::${student.rowIndex}`,
          originalName: file.name,
          displayName,
          documentType,
          renamed: displayName !== file.name,
          studentRowIndex: student.rowIndex,
          studentName: student.nama,
          virtual: documentType === "kk" &&
            matchedStudents.length > 1,
        };
      });
    });
  }, [
    files,
    documentTypes,
    scopedRowsByFile,
    students,
    fileExtractions,
  ]);

  useEffect(() => {
    const sharedKkRows =
      displayFiles.filter(
        (item) =>
          item.documentType === "kk" &&
          item.virtual
      );

    if (
      sharedKkRows.length === 0
    ) {
      return;
    }

    console.log(
      "[SHARED KK VIRTUAL]",
      sharedKkRows.map(
        (item) => ({
          physical:
            item.originalName,
          display:
            item.displayName,
          fileKey:
            item.fileKey,
          outputKey:
            item.outputKey,
          studentRowIndex:
            item.studentRowIndex,
        })
      )
    );
  }, [
    displayFiles,
  ]);
  const pendingFiles = useMemo(() => {
    const processed = new Set(processedFileKeys);
    return files.filter((file) => !processed.has(getDocumentFileKey(file)));
  }, [
    files,
    processedFileKeys,
  ]);
  const hasPendingFiles =
    pendingFiles.length > 0;

  useEffect(() => {
    /*
     * Sinkronkan URL dengan siswa
     * yang sedang aktif/highlight
     * pada session upload.
     */
    if (files.length === 0) {
      return;
    }

    if (primarySessionStudent) {
      setStudentUrl(
        primarySessionStudent.nik
      );

      return;
    }

    /*
     * Selama dokumen masih diproses,
     * jangan reset URL dulu.
     */
    if (
      isPreprocessing ||
      isExtracting ||
      hasPendingFiles
    ) {
      return;
    }

    /*
     * Proses selesai tetapi tidak ada
     * siswa aktif, misalnya dokumen
     * bukan KK/Akta.
     */
    clearStudentUrl();
  }, [
    files.length,
    primarySessionStudent,
    isPreprocessing,
    isExtracting,
    hasPendingFiles,
  ]);
  const setTemporarySaveFeedback = (studentId: string, status: SaveFeedbackStatus) => {
    const currentTimer = saveFeedbackTimersRef.current[studentId];
    if (currentTimer) {
      window.clearTimeout(currentTimer);
    }
    setSaveFeedback((previous) => ({
      ...previous,
      [studentId]: status,
    }));
    saveFeedbackTimersRef.current[studentId] =
      window.setTimeout(() => {
        setSaveFeedback((previous) => ({
          ...previous,
          [studentId]: "idle",
        }));
        delete saveFeedbackTimersRef.current[studentId];
      }, 2000);
  };
  useEffect(() => {
    if (!sessionReady)
      return;
    for (const student of sessionStudents) {
      const studentFileKeys = currentFileKeys.filter((fileKey) => (scopedRowsByFile[fileKey] ?? []).includes(student.rowIndex));
      const studentExtractions = studentFileKeys
        .map((fileKey) => fileExtractions[fileKey])
        .filter(Boolean);
      const kkExtraction = studentExtractions.find((item) => item.kk) ?? null;
      const aktaExtraction = studentExtractions.find((item) => item.akta) ?? null;
      const id = extractStudentNameFromFilename(
        `${student.nama}_KK.pdf`
      );

      const existingHistory =
        historyRef.current.find(
          (item) => item.id === id
        );

      const baseline =
        studentDetailBaseline?.rowIndex ===
          student.rowIndex
          ? studentDetailBaseline
          : null;

      const kk =
        kkExtraction?.kk ??
        baseline?.kk ??
        existingHistory?.kk ??
        null;

      const akta =
        aktaExtraction?.akta ??
        baseline?.akta ??
        existingHistory?.akta ??
        null;
      if (!kk && !akta)
        continue;
      addOrUpdateHistory({
        id,
        studentName: student.nama,
        kk,
        akta,
        modelUsedKk: kk
          ? kkExtraction?.modelUsedKk ??
          baseline?.modelUsedKk ??
          existingHistory?.modelUsedKk ??
          ""
          : "",

        modelUsedAkta: akta
          ? aktaExtraction?.modelUsedAkta ??
          baseline?.modelUsedAkta ??
          existingHistory?.modelUsedAkta ??
          ""
          : "",
        updatedAt: new Date().toISOString(),
        savedToSheetAt: existingHistory?.savedToSheetAt,
      });
    }
  }, [
    sessionReady,
    sessionStudents,
    currentFileKeys,
    scopedRowsByFile,
    fileExtractions,
    studentDetailBaseline,
    addOrUpdateHistory,
  ]);
  useEffect(() => {
    if (files.length === 0 ||
      sessionStudents.length === 0) {
      return;
    }
    const selectedStillValid = selectedStudentRow !== null &&
      sessionStudents.some((student) => student.rowIndex === selectedStudentRow);
    if (!selectedStillValid) {
      setSelectedStudentRow(sessionStudents[0].rowIndex);
    }
  }, [
    files.length,
    sessionStudents,
    selectedStudentRow,
  ]);
  useEffect(() => {
    if (
      files.length === 0 ||
      isExtracting ||
      pendingFiles.length === 0
    ) {
      return;
    }

    console.log(
      "[EXTRACT PENDING FILES]",
      pendingFiles.map(
        (file) => ({
          name: file.name,
          key:
            getDocumentFileKey(
              file
            ),
          size:
            file.size,
        })
      )
    );

    void extract(
      pendingFiles
    );
  }, [
    files,
    pendingFiles,
    isExtracting,
    extract,
  ]);
  useEffect(() => {
    const timers = saveFeedbackTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, []);
  const clearResolutionState = () => {
    setAiTaskOutcomes({});
    setManualTaskResolutions({});
  };
  const invalidateAllAiTasks = () => {
    Object.keys(aiTaskRequestIdsRef.current).forEach((requestKey) => {
      aiTaskRequestIdsRef.current[requestKey] += 1;
    });
    aiTaskPayloadKeysRef.current = {};
    setAiMatchingTaskKeys([]);
  };
  const invalidateAiTasksForFile = (fileKey: string) => {
    const prefix = `${fileKey}::`;
    Object.keys(aiTaskRequestIdsRef.current).forEach((requestKey) => {
      if (!requestKey.startsWith(prefix))
        return;
      aiTaskRequestIdsRef.current[requestKey] += 1;
      delete aiTaskPayloadKeysRef.current[requestKey];
    });
    setAiMatchingTaskKeys((previous) => previous.filter((requestKey) => !requestKey.startsWith(prefix)));
    setAiTaskOutcomes((previous) => {
      const next = { ...previous };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(prefix))
          delete next[key];
      });
      return next;
    });
    setManualTaskResolutions((previous) => {
      const next = { ...previous };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(prefix))
          delete next[key];
      });
      return next;
    });
  };
  const handleUploadFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const pickedFiles =
      Array.from(
        event.target.files ?? []
      );

    event.target.value = "";

    if (pickedFiles.length === 0) {
      return;
    }

    setIsPreprocessing(true);

    try {
      let selectedFiles: File[] = [];

      for (const file of pickedFiles) {
        try {
          const pageCount =
            await getPdfPageCount(file);

          if (pageCount <= 1) {
            selectedFiles.push(file);
            continue;
          }

          console.log(
            "[PDF PREPROCESS] mulai",
            {
              file: file.name,
              pageCount,
            }
          );

          const parts =
            await splitPdfByPage(file);

          console.log(
            "[PDF PREPROCESS] split selesai",
            parts.map(
              (part) =>
                part.file.name
            )
          );

          const identityResults =
            await Promise.all(
              parts.map(
                async (
                  part
                ): Promise<KkPageIdentityResult> => {
                  try {
                    const identity =
                      await getKkPageIdentityWithTimeout(
                        part.file
                      );

                    console.log(
                      "[KK PAGE IDENTITY]",
                      {
                        page:
                          part.pageNumber,
                        documentType:
                          identity.documentType,
                        noKk:
                          identity.noKk,
                        kepala:
                          identity
                            .namaKepalaKeluarga,
                      }
                    );

                    return {
                      part,
                      documentType:
                        identity.documentType,
                      noKk:
                        identity.noKk,
                      namaKepalaKeluarga:
                        identity
                          .namaKepalaKeluarga,
                    };
                  } catch (error) {
                    console.error(
                      "[KK PAGE IDENTITY] gagal",
                      part.file.name,
                      error
                    );

                    return {
                      part,
                      documentType:
                        "unknown",
                      noKk: "",
                      namaKepalaKeluarga:
                        "",
                    };
                  }
                }
              )
            );

          const kkIdentityResults =
            identityResults.filter(
              (item) =>
                item.documentType === "kk"
            );

          const aktaIdentityResults =
            identityResults.filter(
              (item) =>
                item.documentType === "akta"
            );

          const unknownIdentityResults =
            identityResults.filter(
              (item) =>
                item.documentType === "unknown"
            );

          const hasConfirmedKk =
            kkIdentityResults.length > 0;

          /*
           * Jika dalam PDF sudah ada minimal
           * satu halaman KK yang terkonfirmasi,
           * halaman unknown jangan langsung
           * dibuang.
           *
           * Biarkan extractor utama memeriksa
           * halaman tersebut sebagai logical
           * file terpisah.
           */
          const fallbackKkCandidates =
            hasConfirmedKk
              ? unknownIdentityResults
              : [];

          const ignoredIdentityResults =
            hasConfirmedKk
              ? aktaIdentityResults
              : [
                ...aktaIdentityResults,
                ...unknownIdentityResults,
              ];

          if (
            ignoredIdentityResults.length > 0
          ) {
            console.log(
              "[PDF PREPROCESS] halaman non-KK diabaikan",
              ignoredIdentityResults.map(
                (item) => ({
                  page:
                    item.part.pageNumber,
                  documentType:
                    item.documentType,
                })
              )
            );
          }

          const validKkPageCount =
            kkIdentityResults.filter(
              (item) =>
                isValidKkNumber(
                  item.noKk
                )
            ).length;

          const hasAnyKk =
            kkIdentityResults.length > 0;

          if (!hasAnyKk) {
            console.warn(
              "[PDF PREPROCESS] tidak ditemukan halaman KK, gunakan file asli",
              {
                file:
                  file.name,
                pages:
                  identityResults.map(
                    (item) => ({
                      page:
                        item.part.pageNumber,
                      documentType:
                        item.documentType,
                      noKk:
                        item.noKk,
                    })
                  ),
              }
            );

            selectedFiles.push(
              file
            );

            continue;
          }

          console.log(
            "[PDF PREPROCESS] halaman KK terdeteksi",
            {
              file:
                file.name,
              totalPages:
                identityResults.length,
              kkPages:
                kkIdentityResults.length,
              validKkPages:
                validKkPageCount,
              ignoredPages:
                ignoredIdentityResults.length,
            }
          );



          const groups =
            groupKkPages(
              kkIdentityResults
            );

          console.log(
            "[KK PAGE GROUPS]",
            groups.map(
              (group) => ({
                group:
                  group.groupIndex +
                  1,
                noKk:
                  group.noKk ||
                  "TIDAK TERBACA",
                pages:
                  group.pageNumbers,
              })
            )
          );

          const mergedFiles =
            await Promise.all(
              groups.map(
                (group) =>
                  mergePdfParts(
                    file.name,
                    group.parts,
                    group.groupIndex + 1
                  )
              )
            );

          if (
            mergedFiles.length === 0
          ) {
            throw new Error(
              "Tidak ada hasil merge KK."
            );
          }

          console.log(
            "[KK MERGED]",
            mergedFiles.map(
              (mergedFile) => ({
                name:
                  mergedFile.name,
                size:
                  mergedFile.size,
              })
            )
          );

          selectedFiles.push(
            ...mergedFiles
          );

          /*
           * Halaman yang sempat terbaca
           * "unknown" tetap diteruskan
           * sebagai file terpisah jika PDF
           * yang sama sudah memiliki
           * halaman KK terkonfirmasi.
           */
          if (
            fallbackKkCandidates.length > 0
          ) {
            selectedFiles.push(
              ...fallbackKkCandidates.map(
                (item) =>
                  item.part.file
              )
            );

            console.log(
              "[PDF PREPROCESS] halaman unknown diteruskan ke extractor utama",
              fallbackKkCandidates.map(
                (item) => ({
                  page:
                    item.part.pageNumber,
                  file:
                    item.part.file.name,
                })
              )
            );
          }
        } catch (error) {
          console.error(
            "[PDF PREPROCESS] gagal, fallback ke file asli",
            file.name,
            error
          );

          selectedFiles.push(
            file
          );
        }
      }

      selectedFiles =
        dedupeDocumentFiles(
          selectedFiles
        );

      if (selectedFiles.length === 0) {
        return;
      }

      studentRequestIdRef.current += 1;
      setSelectedHistoryId("");
      setLoadingStudentDetail(false);

      const selectedKeys =
        selectedFiles.map(
          getDocumentFileKey
        );

      const filenameIssueEntries =
        selectedFiles.flatMap((file) => {
          const fileKey =
            getDocumentFileKey(file);

          const match =
            file.name.match(
              /^(.*?)[\s_-]+(?:kk|kartu[\s_-]*keluarga|akta(?:[\s_-]*kelahiran)?)\.pdf$/i
            );

          if (!match) {
            return [];
          }

          const detectedName =
            match[1]
              .replace(/[_-]+/g, " ")
              .trim();

          if (!detectedName) {
            return [];
          }

          const rowIndex =
            getNamedStudentRow(
              file,
              students
            );

          if (rowIndex !== null) {
            return [];
          }

          return [
            [
              fileKey,
              {
                status:
                  "not-found" as const,
                detectedName,
              },
            ] as const,
          ];
        });

      setFilenameMatchIssues(
        (previous) => ({
          ...previous,
          ...Object.fromEntries(
            filenameIssueEntries
          ),
        })
      );

      const immediateNamedMatches =
        selectedFiles
          .map((file) => ({
            file,
            fileKey:
              getDocumentFileKey(file),
            rowIndex:
              getNamedStudentRow(
                file,
                students
              ),
          }))
          .filter(
            (
              item
            ): item is {
              file: File;
              fileKey: string;
              rowIndex: number;
            } =>
              item.rowIndex !== null
          );

      const immediateNamedRows = [
        ...new Set(
          immediateNamedMatches.map(
            (item) => item.rowIndex
          )
        ),
      ];

      const notFoundFileKeys =
        new Set(
          filenameIssueEntries.map(
            ([fileKey]) => fileKey
          )
        );

      const allSelectedNotFound =
        selectedFiles.length > 0 &&
        notFoundFileKeys.size ===
        selectedFiles.length;

      if (allSelectedNotFound) {
        invalidateAllAiTasks();
        clearResolutionState();

        files.forEach((file) => {
          const fileKey =
            getDocumentFileKey(file);

          invalidateAiTasksForFile(
            fileKey
          );

          removeFileExtraction(
            file
          );
        });

        reset();

        setFileStudentMatches({});
        setFileStudentScopes({});
        setPendingUploadFileKeys([]);
        setDetectedFileKeys([]);
        setDetectedStudentRowIndexes([]);

        setSelectedHistoryId("");
        setSelectedStudentRow(null);
        setStudentDetailBaseline(null);
        setLoadingStudentDetail(false);

        setFilenameMatchIssues(
          Object.fromEntries(
            filenameIssueEntries
          )
        );

        replaceFiles(
          selectedFiles
        );

        return;
      }

      if (files.length === 0) {
        const baselineRowIndex =
          selectedStudentRow;

        if (
          baselineRowIndex !== null &&
          (
            resultKk ||
            resultAkta
          )
        ) {
          setStudentDetailBaseline({
            rowIndex:
              baselineRowIndex,
            kk:
              resultKk,
            akta:
              resultAkta,
            modelUsedKk,
            modelUsedAkta,
          });
        }

        invalidateAllAiTasks();
        clearResolutionState();
        reset();

        setFileStudentMatches(
          Object.fromEntries(
            immediateNamedMatches.map(
              ({
                fileKey,
                rowIndex,
              }) => [
                  fileKey,
                  createFileStudentMatch(
                    [rowIndex],
                    "exact"
                  ),
                ]
            )
          )
        );

        setFileStudentScopes({});
        setPendingUploadFileKeys([]);
        setDetectedFileKeys(
          selectedKeys
        );

        if (
          immediateNamedRows.length >
          0
        ) {
          setDetectedStudentRowIndexes(
            immediateNamedRows
          );

          setSelectedStudentRow(
            immediateNamedRows[0]
          );
        } else {
          setDetectedStudentRowIndexes(
            []
          );
        }

        replaceFiles(
          selectedFiles
        );

        return;
      }

      const namedRows =
        selectedFiles.map(
          (file) =>
            getNamedStudentRow(
              file,
              students
            )
        );

      const existingReady =
        currentFileKeys.every(
          (fileKey) =>
            Boolean(
              fileExtractions[
              fileKey
              ]
            ) &&
            Boolean(
              fileResolutionComplete[
              fileKey
              ]
            ) &&
            !aiMatchingFileKeys.includes(
              fileKey
            )
        );

      const canUseFilenameFastPath =
        existingReady &&
        namedRows.every(
          (
            rowIndex
          ): rowIndex is number =>
            rowIndex !== null
        );

      if (canUseFilenameFastPath) {
        const incomingRows = [
          ...new Set(
            namedRows
          ),
        ];

        const incomingSet =
          new Set(
            incomingRows
          );

        const keptOldFiles:
          File[] = [];

        const removedOldFiles:
          File[] = [];

        const nextScopes = {
          ...fileStudentScopes,
        };

        immediateNamedMatches.forEach(
          ({
            fileKey,
            rowIndex,
          }) => {
            nextScopes[fileKey] = [
              rowIndex,
            ];
          }
        );

        files.forEach((file) => {
          const fileKey =
            getDocumentFileKey(
              file
            );

          const rawRows =
            rawRowsByFile[
            fileKey
            ] ?? [];

          if (
            rawRows.length === 0
          ) {
            keptOldFiles.push(
              file
            );

            return;
          }

          const overlapRows =
            rawRows.filter(
              (rowIndex) =>
                incomingSet.has(
                  rowIndex
                )
            );

          if (
            overlapRows.length >
            0
          ) {
            keptOldFiles.push(
              file
            );

            nextScopes[
              fileKey
            ] = overlapRows;

            return;
          }

          removedOldFiles.push(
            file
          );

          delete nextScopes[
            fileKey
          ];
        });

        removedOldFiles.forEach(
          (file) => {
            const fileKey =
              getDocumentFileKey(
                file
              );

            invalidateAiTasksForFile(
              fileKey
            );

            removeFileExtraction(
              file
            );
          }
        );

        const removedKeys =
          new Set(
            removedOldFiles.map(
              getDocumentFileKey
            )
          );

        setFileStudentMatches(
          (previous) => {
            const next = {
              ...previous,
            };

            removedKeys.forEach(
              (fileKey) => {
                delete next[
                  fileKey
                ];
              }
            );

            immediateNamedMatches.forEach(
              ({
                fileKey,
                rowIndex,
              }) => {
                next[
                  fileKey
                ] =
                  createFileStudentMatch(
                    [rowIndex],
                    "exact"
                  );
              }
            );

            return next;
          }
        );

        const finalFiles =
          dedupeDocumentFiles([
            ...keptOldFiles,
            ...selectedFiles,
          ]);

        const finalKeys =
          finalFiles.map(
            getDocumentFileKey
          );

        setFileStudentScopes(
          nextScopes
        );

        setPendingUploadFileKeys(
          selectedKeys
        );

        setDetectedFileKeys(
          finalKeys
        );

        setDetectedStudentRowIndexes(
          incomingRows
        );

        setSelectedStudentRow(
          incomingRows[0] ??
          null
        );

        replaceFiles(
          finalFiles
        );

        return;
      }

      if (
        immediateNamedMatches.length >
        0
      ) {
        setFileStudentMatches(
          (previous) => {
            const next = {
              ...previous,
            };

            immediateNamedMatches.forEach(
              ({
                fileKey,
                rowIndex,
              }) => {
                next[
                  fileKey
                ] =
                  createFileStudentMatch(
                    [rowIndex],
                    "exact"
                  );
              }
            );

            return next;
          }
        );

        setDetectedStudentRowIndexes(
          immediateNamedRows
        );

        setSelectedStudentRow(
          immediateNamedRows[0] ??
          null
        );
      }

      setPendingUploadFileKeys(
        (previous) => [
          ...new Set([
            ...previous,
            ...selectedKeys,
          ]),
        ]
      );

      setDetectedFileKeys([
        ...new Set([
          ...currentFileKeys,
          ...selectedKeys,
        ]),
      ]);

      replaceFiles(
        dedupeDocumentFiles([
          ...files,
          ...selectedFiles,
        ])
      );
    } finally {
      setIsPreprocessing(false);
    }




  };

  useEffect(() => {
    if (pendingUploadFileKeys.length === 0) return;

    const pendingSet = new Set(pendingUploadFileKeys);

    const incomingFiles = files.filter((file) =>
      pendingSet.has(getDocumentFileKey(file))
    );

    if (incomingFiles.length !== pendingUploadFileKeys.length) return;

    const incomingReady =
      pendingUploadFileKeys.every(
        (fileKey) => {
          const isFailed =
            failedFileKeySet.has(
              fileKey
            );

          /*
           * File gagal dianggap selesai agar
           * tidak menahan batch lainnya.
           */
          if (isFailed) {
            return true;
          }

          const extractionReady =
            Boolean(
              fileExtractions[
              fileKey
              ]
            );

          /*
           * Extraction sudah selesai tetapi
           * tidak teridentifikasi sebagai
           * KK maupun Akta.
           *
           * File seperti surat, SPTJM,
           * formulir, dan dokumen lainnya
           * tidak membutuhkan student
           * resolution.
           */
          const documentType =
            documentTypes[
            fileKey
            ];

          const supportedDocument =
            documentType === "kk" ||
            documentType === "akta" ||
            documentType === "both";

          const unsupportedDocument =
            extractionReady &&
            !supportedDocument;

          if (unsupportedDocument) {
            return true;
          }

          const resolutionReady =
            Boolean(
              fileResolutionComplete[
              fileKey
              ]
            );

          const aiReady =
            !aiMatchingFileKeys.includes(
              fileKey
            );

          return (
            extractionReady &&
            resolutionReady &&
            aiReady
          );
        }
      );

    if (!incomingReady) {
      return;
    }

    const incomingRows = [
      ...new Set(
        pendingUploadFileKeys.flatMap(
          (fileKey) =>
            rawRowsByFile[fileKey] ?? []
        )
      ),
    ];

    const hasMatchedIncomingStudent =
      incomingRows.length > 0;

    if (!hasMatchedIncomingStudent) {
      const oldFiles = files.filter(
        (file) =>
          !pendingSet.has(
            getDocumentFileKey(file)
          )
      );

      oldFiles.forEach((file) => {
        const fileKey =
          getDocumentFileKey(file);

        invalidateAiTasksForFile(fileKey);
        removeFileExtraction(file);
      });

      setFileStudentMatches((previous) => {
        const next = { ...previous };

        oldFiles.forEach((file) => {
          delete next[
            getDocumentFileKey(file)
          ];
        });

        return next;
      });

      setFileStudentScopes({});
      setPendingUploadFileKeys([]);
      setDetectedFileKeys(
        incomingFiles.map(getDocumentFileKey)
      );
      setDetectedStudentRowIndexes([]);

      setSelectedHistoryId("");
      setSelectedStudentRow(null);
      setStudentDetailBaseline(null);
      setLoadingStudentDetail(false);

      replaceFiles(incomingFiles);
      return;
    }

    const incomingRowSet =
      new Set(incomingRows);

    console.group("========== [RECONCILE START] ==========");

    console.log("[PENDING KEYS]", pendingUploadFileKeys);

    console.log(
      "[INCOMING FILES]",
      incomingFiles.map((file) => ({
        name: file.name,
        key: getDocumentFileKey(file),
      }))
    );

    console.log(
      "[INCOMING ROWS]",
      incomingRows
    );

    console.log(
      "[FILES BEFORE RECONCILE]",
      files.map((file) => ({
        name: file.name,
        key: getDocumentFileKey(file),
      }))
    );

    console.log(
      "[RAW BEFORE RECONCILE]",
      files.map((file) => {
        const fileKey =
          getDocumentFileKey(file);

        return {
          name: file.name,
          fileKey,
          rows:
            rawRowsByFile[fileKey] ?? [],
        };
      })
    );

    const oldFiles = files.filter((file) => !pendingSet.has(getDocumentFileKey(file)));
    const keptOldFiles: File[] = [];
    const removedOldFiles: File[] = [];
    const nextScopes: Record<string, number[]> = { ...fileStudentScopes };

    oldFiles.forEach((file) => {
      const fileKey =
        getDocumentFileKey(file);

      const rawRows =
        rawRowsByFile[fileKey] ?? [];

      const overlapRows =
        rawRows.filter((rowIndex) =>
          incomingRowSet.has(rowIndex)
        );

      console.log("[OLD FILE CHECK]", {
        name: file.name,
        fileKey,
        rawRows,
        incomingRows,
        overlapRows,
        action:
          rawRows.length === 0
            ? "KEEP_EMPTY_RAW"
            : overlapRows.length > 0
              ? "KEEP_OVERLAP"
              : "REMOVE_NO_OVERLAP",
      });

      if (rawRows.length === 0) {
        keptOldFiles.push(file);
        return;
      }

      if (overlapRows.length > 0) {
        keptOldFiles.push(file);
        nextScopes[fileKey] =
          overlapRows;

        return;
      }

      removedOldFiles.push(file);
      delete nextScopes[fileKey];
    });

    // File batch terbaru menjadi sumber kebenaran session dan memakai seluruh hasil match-nya.
    pendingUploadFileKeys.forEach((fileKey) => delete nextScopes[fileKey]);

    removedOldFiles.forEach((file) => {
      const fileKey = getDocumentFileKey(file);
      invalidateAiTasksForFile(fileKey);
      removeFileExtraction(file);
    });

    if (removedOldFiles.length > 0) {
      const removedKeys = new Set(removedOldFiles.map(getDocumentFileKey));
      setFileStudentMatches((previous) => {
        const next = { ...previous };
        removedKeys.forEach((fileKey) => delete next[fileKey]);
        return next;
      });
    }

    const finalFiles =
      dedupeDocumentFiles([
        ...keptOldFiles,
        ...incomingFiles,
      ]);

    console.log(
      "[KEPT OLD FILES]",
      keptOldFiles.map((file) => ({
        name: file.name,
        key: getDocumentFileKey(file),
      }))
    );

    console.log(
      "[REMOVED OLD FILES]",
      removedOldFiles.map((file) => ({
        name: file.name,
        key: getDocumentFileKey(file),
      }))
    );

    console.log(
      "[FINAL FILES]",
      finalFiles.map((file) => ({
        name: file.name,
        key: getDocumentFileKey(file),
      }))
    );

    console.log(
      "[NEXT SCOPES]",
      nextScopes
    );

    console.groupEnd();
    const finalKeys = finalFiles.map(getDocumentFileKey);
    setFileStudentScopes(nextScopes);
    setDetectedFileKeys(finalKeys);
    setPendingUploadFileKeys([]);
    replaceFiles(finalFiles);

    if (selectedStudentRow !== null && !incomingRows.includes(selectedStudentRow)) {
      setSelectedStudentRow(incomingRows[0] ?? null);
    }
  }, [
    pendingUploadFileKeys,
    files,
    fileExtractions,
    fileResolutionComplete,
    aiMatchingFileKeys,
    fileStudentMatches,
    fileStudentScopes,
    rawRowsByFile,
    selectedStudentRow,
    replaceFiles,
    removeFileExtraction,
  ]);

  const handleResolveFileStudent = (fileKey: string, taskKey: string, rowIndex: number) => {
    if (!currentFileKeySet.has(fileKey))
      return;
    const task = manualTasksByFile[fileKey]?.find((item) => item.taskKey === taskKey);
    if (!task)
      return;
    const validCandidate = task.candidates.some((candidate) => candidate.rowIndex === rowIndex);
    if (!validCandidate)
      return;
    const studentExists = students.some((student) => student.rowIndex === rowIndex);
    if (!studentExists)
      return;
    const alreadyClaimed = fileStudentMatches[fileKey]?.rowIndexes.includes(rowIndex);
    if (alreadyClaimed)
      return;
    setManualTaskResolutions((previous) => ({
      ...previous,
      [`${fileKey}::${taskKey}`]: {
        status: "matched",
        rowIndex,
      },
    }));
    setFileStudentMatches((previous) => {
      const existingRows = previous[fileKey]?.rowIndexes ?? [];
      return {
        ...previous,
        [fileKey]: createFileStudentMatch([...existingRows, rowIndex], "manual"),
      };
    });
  };
  const handleRemoveUploadFile = (
    fileKey: string,
    studentRowIndex: number | null
  ) => {
    const index = files.findIndex(
      (file) =>
        getDocumentFileKey(file) === fileKey
    );

    if (index === -1) return;

    const file = files[index];

    const removingActiveStudent =
      studentRowIndex !== null &&
      selectedStudentRow ===
      studentRowIndex;

    const rawRows =
      rawRowsByFile[fileKey] ?? [];

    const currentScopedRows = [
      ...new Set(
        scopedRowsByFile[
        fileKey
        ] ?? []
      ),
    ];

    const isSharedKk =
      Boolean(fileExtractions[fileKey]?.kk) &&
      rawRows.length > 1 &&
      studentRowIndex !== null;

    /*
     * Shared KK:
     * hapus hanya virtual student dari scope.
     * Physical PDF + RAW extraction tetap dipertahankan
     * selama masih ada student lain dalam scope.
     */
    if (isSharedKk) {
      const remainingRows =
        currentScopedRows.filter(
          (rowIndex) =>
            rowIndex !== studentRowIndex
        );

      if (remainingRows.length > 0) {
        setFileStudentScopes((previous) => ({
          ...previous,
          [fileKey]: remainingRows,
        }));

        if (
          selectedStudentRow ===
          studentRowIndex
        ) {
          clearStudentUrl();

          setSelectedStudentRow(
            remainingRows[0] ?? null
          );
        }

        return;
      }

      /*
       * Kalau student terakhir dari Shared KK
       * dihapus, baru physical file dihapus.
       */
    }

    invalidateAiTasksForFile(
      fileKey
    );

    removeFileExtraction(
      file
    );

    /*
     * Hapus physical file berdasarkan
     * fileKey, bukan berdasarkan posisi
     * index pada array.
     *
     * Ini memastikan file lain,
     * termasuk Bukan KK/Akta,
     * tetap dipertahankan.
     */
    const remainingFiles =
      files.filter(
        (item) =>
          getDocumentFileKey(
            item
          ) !== fileKey
      );

    replaceFiles(
      remainingFiles
    );

    setDetectedFileKeys((previous) =>
      previous.filter(
        (key) => key !== fileKey
      )
    );

    setPendingUploadFileKeys((previous) =>
      previous.filter(
        (key) => key !== fileKey
      )
    );

    setFileStudentScopes((previous) => {
      const next = { ...previous };
      delete next[fileKey];
      return next;
    });

    setFileStudentMatches((previous) => {
      const next = { ...previous };
      delete next[fileKey];
      return next;
    });

    const remainingFileKeys =
      remainingFiles.map(
        getDocumentFileKey
      );

    const remainingSessionRows = [
      ...new Set(
        remainingFileKeys.flatMap(
          (key) =>
            scopedRowsByFile[key] ?? []
        )
      ),
    ];

    setDetectedStudentRowIndexes(
      remainingSessionRows
    );

    if (
      selectedStudentRow !== null &&
      !remainingSessionRows.includes(
        selectedStudentRow
      )
    ) {
      const nextStudentRow =
        remainingSessionRows[0] ??
        null;

      setSelectedStudentRow(
        nextStudentRow
      );

      /*
       * Siswa aktif sudah tidak menjadi
       * bagian session.
       *
       * Detail lama tidak boleh tetap
       * tampil.
       */
      setStudentDetailBaseline(
        null
      );

      setSelectedHistoryId(
        ""
      );

      setLoadingStudentDetail(
        false
      );

      if (
        nextStudentRow === null
      ) {
        /*
         * Tidak ada murid lain.
         * Contoh:
         *
         * Jauza_KK.pdf dihapus,
         * tetapi file Bukan KK/Akta
         * masih tersisa.
         */
        clearStudentUrl();
      }
    }

    if (remainingFileKeys.length === 0) {
      clearStudentUrl();

      setDetectedFileKeys([]);
      setDetectedStudentRowIndexes([]);
      setSelectedHistoryId("");
      setSelectedStudentRow(null);
      setStudentDetailBaseline(null);
      setLoadingStudentDetail(false);
      setFilenameMatchIssues({});
      setFileStudentMatches({});
      setFileStudentScopes({});
      setPendingUploadFileKeys([]);
      setAiMatchingTaskKeys([]);
      clearResolutionState();
    }
  };
  const handleResetUploadSession = () => {
    studentRequestIdRef.current += 1;
    invalidateAllAiTasks();
    clearResolutionState();
    clearFiles();
    reset();
    setDetectedFileKeys([]);
    setDetectedStudentRowIndexes([]);
    setSelectedHistoryId("");
    setSelectedStudentRow(null);
    setLoadingStudentDetail(false);
    setFileStudentMatches({});
    setFileStudentScopes({});
    setPendingUploadFileKeys([]);
  };
  const handleSelectStudent = async (
    student: StudentRecord
  ) => {
    if (isExtracting) {
      return;
    }

    setStudentUrl(
      student.nik
    );
    if (files.length > 0 &&
      sessionStudentRowIndexes.includes(student.rowIndex)) {
      setSelectedStudentRow(student.rowIndex);
      setSelectedHistoryId("");
      return;
    }
    const requestId = ++studentRequestIdRef.current;
    invalidateAllAiTasks();
    clearResolutionState();
    clearFiles();
    reset();
    setDetectedFileKeys([]);
    setDetectedStudentRowIndexes([]);
    setSelectedStudentRow(student.rowIndex);
    setSelectedHistoryId("");
    setLoadingStudentDetail(false);
    setFileStudentMatches({});
    setFileStudentScopes({});
    setPendingUploadFileKeys([]);
    const normalizedStudentName = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);
    setSelectedHistoryId(normalizedStudentName);
    const localItem = historyMap.get(normalizedStudentName);

    if (localItem) {
      setStudentDetailBaseline({
        rowIndex: student.rowIndex,
        kk: localItem.kk,
        akta: localItem.akta,
        modelUsedKk: localItem.modelUsedKk,
        modelUsedAkta: localItem.modelUsedAkta,
      });

      restore({
        kk: localItem.kk,
        akta: localItem.akta,
        modelUsedKk: localItem.modelUsedKk,
        modelUsedAkta: localItem.modelUsedAkta,
        kkSource: localItem.kk
          ? "extraction"
          : "none",
        aktaSource: localItem.akta
          ? "extraction"
          : "none",
      });

      return;
    }
    setLoadingStudentDetail(true);
    try {
      const detail = await getStudentDetail(student.rowIndex);

      if (
        requestId !==
        studentRequestIdRef.current
      ) {
        return;
      }

      setStudentDetailBaseline({
        rowIndex: student.rowIndex,
        kk: detail.kk,
        akta: detail.akta,
        modelUsedKk: "",
        modelUsedAkta: "",
      });

      restore({
        kk: detail.kk,
        akta: detail.akta,
        modelUsedKk: "",
        modelUsedAkta: "",
        kkSource: detail.kk
          ? "sheet"
          : "none",
        aktaSource: detail.akta
          ? "sheet"
          : "none",
      });
    }
    catch (error) {
      if (requestId !==
        studentRequestIdRef.current) {
        return;
      }
      console.error("[Student Detail]", error);
      reset();
    }
    finally {
      if (requestId ===
        studentRequestIdRef.current) {
        setLoadingStudentDetail(false);
      }
    }
  };
  useEffect(() => {
    if (
      loadingStudents ||
      students.length === 0
    ) {
      return;
    }

    const nikFromUrl =
      getNikFromPathname(
        window.location.pathname
      );

    if (!nikFromUrl) {
      return;
    }

    if (
      restoredNikRef.current ===
      nikFromUrl
    ) {
      return;
    }

    const student =
      students.find(
        (item) =>
          item.nik
            .replace(/\D/g, "") ===
          nikFromUrl
      );

    if (!student) {
      console.warn(
        "[STUDENT URL] NIK tidak ditemukan:",
        nikFromUrl
      );

      restoredNikRef.current =
        nikFromUrl;

      return;
    }

    restoredNikRef.current =
      nikFromUrl;

    void handleSelectStudent(
      student
    );
  }, [
    loadingStudents,
    students,
  ]);
  const handleIgnoreFileStudent = (fileKey: string, taskKey: string) => {
    if (!currentFileKeySet.has(fileKey))
      return;
    const task = manualTasksByFile[fileKey]?.find((item) => item.taskKey === taskKey);
    if (!task)
      return;
    setManualTaskResolutions((previous) => ({
      ...previous,
      [`${fileKey}::${taskKey}`]: {
        status: "not-enrolled",
        rowIndex: null,
      },
    }));
  };
  const getSessionSavePayload = (student: StudentRecord) => {
    if (!sessionStudentRowIndexes.includes(student.rowIndex)) {
      console.warn("[Save Payload] Student tidak termasuk session aktif:", {
        rowIndex: student.rowIndex,
        nama: student.nama,
      });
      return null;
    }
    const studentFileKeys = currentFileKeys.filter((fileKey) => (scopedRowsByFile[fileKey] ?? []).includes(student.rowIndex));
    if (studentFileKeys.length === 0) {
      console.warn("[Save Payload] Tidak ada file yang cocok dengan student:", {
        rowIndex: student.rowIndex,
        nama: student.nama,
      });
      return null;
    }
    const studentExtractions = studentFileKeys
      .map((fileKey) => ({
        fileKey,
        extraction: fileExtractions[fileKey],
      }))
      .filter((item): item is {
        fileKey: string;
        extraction: NonNullable<(typeof fileExtractions)[string]>;
      } => Boolean(item.extraction));
    const kkItem = studentExtractions.find(({ extraction }) => Boolean(extraction.kk)) ?? null;
    const aktaItem = studentExtractions.find(({ extraction }) => Boolean(extraction.akta)) ?? null;
    const extractedData = !student.kkComplete
      ? kkItem?.extraction.kk ?? null
      : null;
    const aktaData = !student.aktaComplete
      ? aktaItem?.extraction.akta ?? null
      : null;
    if (!extractedData && !aktaData) {
      console.warn("[Save Payload] Tidak ada data baru untuk disimpan:", {
        rowIndex: student.rowIndex,
        nama: student.nama,
        kkComplete: student.kkComplete,
        aktaComplete: student.aktaComplete,
        studentFileKeys,
      });
      return null;
    }
    console.log("[Save Payload]", {
      rowIndex: student.rowIndex,
      nama: student.nama,
      studentFileKeys,
      kkFileKey: kkItem?.fileKey ?? null,
      aktaFileKey: aktaItem?.fileKey ?? null,
      hasKk: Boolean(extractedData),
      hasAkta: Boolean(aktaData),
    });
    return {
      rowIndex: student.rowIndex,
      extractedData,
      aktaData,
      fileName: `${student.nama}_KK.pdf`,
    };
  };

  const handleSaveStudent = async (student: StudentRecord) => {
    if (savingStudentId || savingAll || sessionConflict || duplicateDocumentMsg)
      return;
    const currentStudent = students.find((item) => item.rowIndex === student.rowIndex);
    if (!currentStudent)
      return;
    if (normalizeStudentName(currentStudent.nama) !== normalizeStudentName(student.nama))
      return;
    const normalizedStudentName = extractStudentNameFromFilename(`${currentStudent.nama}_KK.pdf`);
    if (files.length > 0) {
      const payload = getSessionSavePayload(currentStudent);
      if (!payload) {
        console.warn("[Save Student] Tidak ada data yang dapat disimpan untuk murid:", {
          rowIndex: currentStudent.rowIndex,
          nama: currentStudent.nama,
        });
        setTemporarySaveFeedback(normalizedStudentName, "error");
        return;
      }
      setSavingStudentId(normalizedStudentName);
      try {
        const result = await save(payload);
        console.log("[Save Student Result]", {
          student: currentStudent.nama,
          rowIndex: currentStudent.rowIndex,
          result,
        });
        if (!result.success) {
          console.error("[Save Student] API gagal menyimpan:", {
            student: currentStudent.nama,
            rowIndex: currentStudent.rowIndex,
            message: result.message,
          });
          setTemporarySaveFeedback(normalizedStudentName, "error");
          return;
        }
        markAsSaved(normalizedStudentName);
        await refreshStudents();
        setSelectedStudentRow(currentStudent.rowIndex);
        setTemporarySaveFeedback(normalizedStudentName, "success");
      }
      catch (error) {
        console.error("[Save Student Upload Session]", error);
        setTemporarySaveFeedback(normalizedStudentName, "error");
      }
      finally {
        setSavingStudentId("");
      }
      return;
    }
    const localItem = historyMap.get(normalizedStudentName);
    if (!localItem)
      return;
    const extractedData = !currentStudent.kkComplete && localItem.kk
      ? localItem.kk
      : null;
    const aktaData = !currentStudent.aktaComplete && localItem.akta
      ? localItem.akta
      : null;
    if (!extractedData && !aktaData)
      return;
    setSavingStudentId(normalizedStudentName);
    try {
      const result = await save({
        rowIndex: currentStudent.rowIndex,
        extractedData,
        aktaData,
        fileName: `${localItem.studentName}_KK.pdf`,
      });
      if (!result.success) {
        console.error("[Save Student History] API gagal menyimpan:", {
          student: currentStudent.nama,
          rowIndex: currentStudent.rowIndex,
          message: result.message,
        });
        setTemporarySaveFeedback(normalizedStudentName, "error");
        return;
      }
      markAsSaved(normalizedStudentName);
      await refreshStudents();
      setSelectedStudentRow(currentStudent.rowIndex);
      setTemporarySaveFeedback(normalizedStudentName, "success");
    }
    catch (error) {
      console.error("[Save Student History]", error);
      setTemporarySaveFeedback(normalizedStudentName, "error");
    }
    finally {
      setSavingStudentId("");
    }
  };
  const handleSaveAllStudents = async (targetStudents: StudentRecord[]) => {
    if (savingAll ||
      savingStudentId ||
      sessionConflict ||
      duplicateDocumentMsg ||
      targetStudents.length === 0) {
      return;
    }
    const sourceStudents =
      [
        ...new Map(
          (
            files.length > 0
              ? targetStudents.filter(
                (student) =>
                  sessionStudentRowIndexes.includes(
                    student.rowIndex
                  )
              )
              : targetStudents
          ).map(
            (student) => [
              student.rowIndex,
              student,
            ]
          )
        ).values(),
      ];
    if (sourceStudents.length === 0)
      return;
    const rawPayloads = sourceStudents
      .map((student) => {
        if (files.length > 0) {
          return getSessionSavePayload(student);
        }
        const studentId = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);
        const localItem = historyMap.get(studentId);
        if (!localItem)
          return null;
        const extractedData = !student.kkComplete && localItem.kk
          ? localItem.kk
          : null;
        const aktaData = !student.aktaComplete && localItem.akta
          ? localItem.akta
          : null;
        if (!extractedData && !aktaData)
          return null;
        return {
          rowIndex: student.rowIndex,
          extractedData,
          aktaData,
          fileName: `${student.nama}_KK.pdf`,
        };
      })
      .filter((payload): payload is NonNullable<typeof payload> => payload !== null);
    const payloadMap = new Map<number, (typeof rawPayloads)[number]>();
    rawPayloads.forEach((payload) => {
      if (!payloadMap.has(payload.rowIndex)) {
        payloadMap.set(payload.rowIndex, payload);
      }
    });
    const payloads = [...payloadMap.values()];
    if (payloads.length === 0) {
      console.warn("[Save All] Tidak ada data baru yang dapat disimpan.");
      return;
    }
    console.log("[Save All Payloads]", payloads.map((payload) => ({
      rowIndex: payload.rowIndex,
      hasKk: Boolean(payload.extractedData),
      hasAkta: Boolean(payload.aktaData),
      fileName: payload.fileName,
    })));
    try {
      const result = await saveMany(payloads);
      console.log("[Save All Result]", result);
      const resultRows = new Set<number>();
      for (const item of result.results) {
        resultRows.add(item.rowIndex);
        const student = students.find((candidate) => candidate.rowIndex === item.rowIndex);
        if (!student)
          continue;
        const studentId = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);
        setTemporarySaveFeedback(studentId, item.success
          ? "success"
          : "error");
        if (item.success) {
          markAsSaved(studentId);
        }
        else {
          console.error("[Save All] Gagal menyimpan siswa:", {
            student: student.nama,
            rowIndex: student.rowIndex,
            result: item,
          });
        }
      }
      payloads.forEach((payload) => {
        if (resultRows.has(payload.rowIndex))
          return;
        const student = students.find((candidate) => candidate.rowIndex === payload.rowIndex);
        if (!student)
          return;
        const studentId = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);
        console.error("[Save All] Tidak ada response untuk siswa:", {
          student: student.nama,
          rowIndex: student.rowIndex,
        });
        setTemporarySaveFeedback(studentId, "error");
      });
      if (result.successCount > 0) {
        await refreshStudents();
      }
    }
    catch (error) {
      console.error("[Save All Students]", error);
      payloads.forEach((payload) => {
        const student = students.find((candidate) => candidate.rowIndex === payload.rowIndex);
        if (!student)
          return;
        const studentId = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);
        setTemporarySaveFeedback(studentId, "error");
      });
    }
  };

  const testPdfSplitter = async (
    file: File
  ) => {
    try {
      const pageCount =
        await getPdfPageCount(file);

      console.log(
        "[PDF SPLITTER] PAGE COUNT",
        {
          file: file.name,
          pageCount,
        }
      );

      const parts =
        await splitPdfByPage(file);

      console.log(
        "[PDF SPLITTER] PARTS",
        parts.map((part) => ({
          sourceName:
            part.sourceName,
          sourcePageCount:
            part.sourcePageCount,
          pageIndex:
            part.pageIndex,
          pageNumber:
            part.pageNumber,
          fileName:
            part.file.name,
          fileSize:
            part.file.size,
        }))
      );

      return parts;
    } catch (error) {
      console.error(
        "[PDF SPLITTER]",
        error
      );

      return [];
    }
  };
  return (<DashboardLayout>
    <DashboardContent>
      <section className="col-span-12 h-full lg:col-span-6">
        <UploadSection files={files} displayFiles={displayFiles} fileStudentMatches={fileStudentMatches} manualTasks={manualTasksByFile} manualTaskResolutions={manualTaskResolutions} students={students} processedFileKeys={processedFileKeys} aiMatchingFileKeys={aiMatchingFileKeys} isExtracting={isExtracting} errorMsg={errorMsg} conflictMsg={sessionConflict} duplicateMsg={duplicateDocumentMsg} sessionReady={sessionReady} hasPendingFiles={hasPendingFiles} onFileChange={handleUploadFileChange} onRemoveFile={handleRemoveUploadFile} onResetSession={handleResetUploadSession} onResolveStudent={handleResolveFileStudent} onIgnoreStudent={handleIgnoreFileStudent} filenameMatchIssues={filenameMatchIssues} failedFileKeys={failedFileKeys} isPreprocessing={isPreprocessing} />
      </section>

      <StudentPanel
        key={files.length > 0 && sessionStudents.length === 0 ? "no-active-student" : "active-student"}
        students={students}
        history={history}
        loading={loadingStudents}
        error={studentError}
        activeRowIndex={selectedStudentRow}
        priorityRowIndexes={detectedStudentRowIndexes}
        savingStudentId={savingStudentId}
        saveFeedback={saveFeedback}
        onSelect={handleSelectStudent}
        onRefresh={refreshStudents}
        onSave={handleSaveStudent}
        onSaveAll={handleSaveAllStudents}
        savingAll={savingAll}
      />

      <AktaPanel
        data={activeAkta}
        modelUsed={activeModelUsedAkta}
        isLoading={loadingStudentDetail}
      />

      <KkSummary
        data={activeKk}
        modelUsed={activeModelUsedKk}
        isLoading={loadingStudentDetail}
      />

      <KkMembers
        data={activeKk}
        studentName={activeStudentName}
        isLoading={loadingStudentDetail}
      />

      {(loadingStudentDetail || isAiMatching) && (<div className="pointer-events-none fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />

        {isAiMatching
          ? "Mencocokkan nama murid..."
          : "Memuat detail murid..."}
      </div>)}
    </DashboardContent>
  </DashboardLayout>);
}
