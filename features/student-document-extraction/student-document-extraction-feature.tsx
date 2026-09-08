"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import DashboardContent from "@/components/dashboard/dashboard-content";

import UploadSection from "@/features/student-document-extraction/components/upload-section";
import StudentPanel from "@/features/student-document-extraction/components/student-panel";
import KkSummary from "@/features/student-document-extraction/components/kk-summary";
import KkMembers from "@/features/student-document-extraction/components/kk-members";
import AktaPanel from "@/features/student-document-extraction/components/akta-panel";

import { extractStudentNameFromFilename } from "@/lib/documents/document-name";
import { createCanonicalFileName } from "@/features/student-document-extraction/lib/documents/canonical-file-name";
import { createFileStudentMatch } from "@/lib/students/file-student-matcher";
import { normalizeStudentName } from "@/lib/students/student-matcher";
import { getStudentDetail } from "@/lib/api/students";
import { preprocessUploadFiles } from "@/features/student-document-extraction/lib/documents/preprocess-upload-files";
import { useDocumentExtraction } from "@/features/student-document-extraction/hooks/use-document-extraction";
import { useDocumentFiles } from "@/features/student-document-extraction/hooks/use-document-files";
import { useExtractionHistory } from "@/features/student-document-extraction/hooks/use-extraction-history";
import { useStudents } from "@/hooks/use-students";
import { useStudentSave } from "@/features/student-document-extraction/hooks/use-student-save";
import { useFileStudentResolution } from "@/features/student-document-extraction/hooks/use-file-student-resolution";
import { useSaveFeedback } from "@/hooks/use-save-feedback";
import { buildDocumentDisplayFiles } from "@/features/student-document-extraction/lib/document-display-files";
import { getActiveDocumentView } from "@/features/student-document-extraction/lib/active-document-view";
import { useSessionHistorySync } from "@/features/student-document-extraction/hooks/use-session-history-sync";
import { usePendingDocumentExtraction } from "@/features/student-document-extraction/hooks/use-pending-document-extraction";
import { useStudentUrlRestore } from "@/features/student-document-extraction/hooks/use-student-url-restore";
import { analyzeUploadStudentFilenames } from "@/features/student-document-extraction/lib/analyze-upload-student-filenames";
import { getUploadFastPathState } from "@/features/student-document-extraction/lib/get-upload-fast-path-state";
import { useSessionUrlSync } from "@/features/student-document-extraction/hooks/use-session-url-sync";
import { useSessionStudentSelection } from "@/features/student-document-extraction/hooks/use-session-student-selection";
import { useStudentDetailBaseline } from "@/features/student-document-extraction/hooks/use-student-detail-baseline";
import { getSessionDocumentState } from "@/features/student-document-extraction/lib/session-document-state";
import { getStudentFileMembership } from "@/features/student-document-extraction/lib/student-file-membership";
import { planUploadSessionMerge } from "@/features/student-document-extraction/lib/upload-session-planner";
import { planDocumentRemoval } from "@/features/student-document-extraction/lib/document-removal-planner";
import { buildSessionSavePayload } from "@/features/student-document-extraction/lib/session-save-payload";
import { useSessionReadiness } from "@/features/student-document-extraction/hooks/use-session-readiness";
import type { StudentRecord } from "@/types/student";
import { dedupeDocumentFiles, toNameCase } from "@/lib/documents/document-helpers";
import { getDocumentFileKey } from "@/lib/documents/document-file-key";
import { clearStudentUrl, setStudentUrl } from "@/lib/students/student-url";

export default function StudentDocumentExtractionFeature() {
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [selectedStudentRow, setSelectedStudentRow] = useState<number | null>(null);
  const [savingStudentId, setSavingStudentId] = useState("");

  const [detectedFileKeys, setDetectedFileKeys] = useState<string[]>([]);
  const [detectedStudentRowIndexes, setDetectedStudentRowIndexes] = useState<number[]>([]);
  const [fileStudentScopes, setFileStudentScopes] = useState<Record<string, number[]>>({});
  const [pendingUploadFileKeys, setPendingUploadFileKeys] = useState<string[]>([]);
  const { saveFeedback, setTemporarySaveFeedback } = useSaveFeedback();
  const studentRequestIdRef = useRef(0);

  const { isExtracting, resultKk, resultAkta, modelUsedKk, modelUsedAkta, processedFileKeys, failedFileKeys, documentTypes, fileExtractions, errorMsg, extract, removeFileExtraction, restore, reset, } = useDocumentExtraction();
  const { history, addOrUpdateHistory, markAsSaved } = useExtractionHistory();
  const { students, loadingStudents, studentError, refreshStudents } = useStudents();
  const { saving: savingAll, save, saveMany } = useStudentSave();
  const { files, clearFiles, replaceFiles } = useDocumentFiles();
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


  const currentFileKeys = useMemo(() => files.map((file) => getDocumentFileKey(file)), [files]);
  const currentFileKeySet = useMemo(() => new Set(currentFileKeys), [currentFileKeys]);
  const {
    fileStudentMatches,
    setFileStudentMatches,
    aiMatchingFileKeys,
    isAiMatching,
    manualTasksByFile,
    manualTaskResolutions,
    fileResolutionComplete,
    clearResolutionState,
    invalidateAllAiTasks,
    invalidateAiTasksForFile,
    resolveFileStudent,
    ignoreFileStudent,
  } = useFileStudentResolution({
    currentFileKeys,
    fileExtractions,
    students,
  });
  useEffect(() => {
    const processedSet = new Set(processedFileKeys);
    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

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

          if (next[fileKey]) {
            delete next[fileKey];
            changed = true;
          }
        });

        return changed ? next : previous;
      });
    });

    return () => {
      active = false;
    };
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

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

      duplicateFiles.forEach((file) => {
        const fileKey =
          getDocumentFileKey(file);

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
          (fileKey) =>
            !duplicateKeys.has(fileKey)
        )
      );

      setDetectedFileKeys((previous) =>
        previous.filter(
          (fileKey) =>
            !duplicateKeys.has(fileKey)
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
    });

    return () => {
      active = false;
    };
  }, [
    files,
    processedFileKeys,
    fileExtractions,
    filenameMatchIssues,
    replaceFiles,
    removeFileExtraction,
    invalidateAiTasksForFile,
    setFileStudentMatches,
  ]);



  const {
    rawRowsByFile,
    scopedRowsByFile,
  } = useMemo(
    () =>
      getStudentFileMembership({
        currentFileKeys,
        fileStudentMatches,
        fileStudentScopes,
      }),
    [
      currentFileKeys,
      fileStudentMatches,
      fileStudentScopes,
    ]
  );

  const { sessionStudentRowIndexes, sessionStudents, sessionConflict, duplicateDocumentMsg, sessionReady } = useSessionReadiness({ filesLength: files.length, currentFileKeys, scopedRowsByFile, fileExtractions, fileStudentMatches, fileResolutionComplete, failedFileKeys, students, pendingUploadFileKeys, isExtracting, isAiMatching });
  useEffect(() => {
    const rows =
      detectedFileKeys.length === 0
        ? []
        : [
          ...new Set(
            detectedFileKeys
              .filter((fileKey) =>
                currentFileKeySet.has(fileKey)
              )
              .flatMap(
                (fileKey) =>
                  scopedRowsByFile[fileKey] ?? []
              )
          ),
        ];

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

      setDetectedStudentRowIndexes(
        (previous) => {
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
        }
      );
    });

    return () => {
      active = false;
    };
  }, [
    detectedFileKeys,
    currentFileKeySet,
    scopedRowsByFile,
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
  const { studentDetailBaseline, setStudentDetailBaseline, loadingStudentDetail, setLoadingStudentDetail, resetStudentDetailBaseline } = useStudentDetailBaseline({ filesLength: files.length, primarySessionStudent, history });
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


  const {
    sessionKkExtraction,
    sessionAktaExtraction,
    unregisteredExtraction,
    activeStudentBaseline,
  } = getSessionDocumentState({
    currentFileKeys,
    scopedRowsByFile,
    fileExtractions,
    sessionStudents,
    primarySessionStudent,
    selectedStudentRow,
    filesLength: files.length,
    studentDetailBaseline,
  });

  const {
    activeKk,
    activeAkta,
    activeModelUsedKk,
    activeModelUsedAkta,
    activeStudentName,
  } = getActiveDocumentView({
    filesLength: files.length,
    selectedHistoryId,
    primarySessionStudent,
    sessionKkExtraction,
    sessionAktaExtraction,
    unregisteredExtraction,
    activeStudentBaseline,
    resultKk,
    resultAkta,
    modelUsedKk,
    modelUsedAkta,
  });

  const displayFiles = buildDocumentDisplayFiles({
    files,
    documentTypes,
    fileExtractions,
    scopedRowsByFile,
    students,
  });

  const { hasPendingFiles } = usePendingDocumentExtraction({ files, processedFileKeys, isExtracting, extract });

  useSessionHistorySync({ sessionReady, sessionStudents, currentFileKeys, scopedRowsByFile, fileExtractions, studentDetailBaseline, history, addOrUpdateHistory });
  useSessionUrlSync({ filesLength: files.length, primarySessionStudent, isPreprocessing, isExtracting, hasPendingFiles });
  useSessionStudentSelection({ filesLength: files.length, sessionStudents, selectedStudentRow, setSelectedStudentRow });



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
      const selectedFiles = await preprocessUploadFiles(pickedFiles);

      if (selectedFiles.length === 0) {
        return;
      }

      studentRequestIdRef.current += 1;
      setSelectedHistoryId("");
      setLoadingStudentDetail(false);

      const {
        selectedKeys,
        filenameIssueEntries,
        immediateNamedMatches,
        immediateNamedRows,
        allSelectedNotFound,
      } = analyzeUploadStudentFilenames(
        selectedFiles,
        students
      );

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
        resetStudentDetailBaseline();

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

      const {
        canUseFilenameFastPath,
        incomingRows,
      } = getUploadFastPathState({
        selectedFiles,
        students,
        currentFileKeys,
        fileExtractions,
        fileResolutionComplete,
        aiMatchingFileKeys,
      });

      if (canUseFilenameFastPath) {
        const initialScopes = {
          ...fileStudentScopes,
        };

        immediateNamedMatches.forEach(({ fileKey, rowIndex }) => {
          initialScopes[fileKey] = [rowIndex];
        });

        const {
          keptOldFiles,
          removedOldFiles,
          nextScopes,
        } = planUploadSessionMerge({
          existingFiles: files,
          incomingRows,
          rawRowsByFile,
          initialScopes,
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

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

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
        resetStudentDetailBaseline();

        replaceFiles(incomingFiles);
        return;
      }

      const oldFiles = files.filter(
        (file) =>
          !pendingSet.has(
            getDocumentFileKey(file)
          )
      );

      const {
        keptOldFiles,
        removedOldFiles,
        nextScopes,
      } = planUploadSessionMerge({
        existingFiles: oldFiles,
        incomingRows,
        rawRowsByFile,
        initialScopes: fileStudentScopes,
      });

      pendingUploadFileKeys.forEach(
        (fileKey) => delete nextScopes[fileKey]
      );

      removedOldFiles.forEach((file) => {
        const fileKey =
          getDocumentFileKey(file);

        invalidateAiTasksForFile(fileKey);
        removeFileExtraction(file);
      });

      if (removedOldFiles.length > 0) {
        const removedKeys =
          new Set(
            removedOldFiles.map(
              getDocumentFileKey
            )
          );

        setFileStudentMatches((previous) => {
          const next = { ...previous };

          removedKeys.forEach(
            (fileKey) => delete next[fileKey]
          );

          return next;
        });
      }

      const finalFiles =
        dedupeDocumentFiles([
          ...keptOldFiles,
          ...incomingFiles,
        ]);

      const finalKeys =
        finalFiles.map(getDocumentFileKey);

      setFileStudentScopes(nextScopes);
      setDetectedFileKeys(finalKeys);
      setPendingUploadFileKeys([]);
      replaceFiles(finalFiles);

      if (
        selectedStudentRow !== null &&
        !incomingRows.includes(
          selectedStudentRow
        )
      ) {
        setSelectedStudentRow(
          incomingRows[0] ?? null
        );
      }
    });

    return () => {
      active = false;
    };
  }, [
    pendingUploadFileKeys,
    files,
    fileExtractions,
    documentTypes,
    fileResolutionComplete,
    aiMatchingFileKeys,
    fileStudentMatches,
    fileStudentScopes,
    rawRowsByFile,
    failedFileKeySet,
    selectedStudentRow,
    replaceFiles,
    removeFileExtraction,
    resetStudentDetailBaseline,
    invalidateAiTasksForFile,
    setFileStudentMatches,
  ]);

  const handleResolveFileStudent = resolveFileStudent;
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

    const removalPlan = planDocumentRemoval({
      hasKkExtraction: Boolean(fileExtractions[fileKey]?.kk),
      rawRows: rawRowsByFile[fileKey] ?? [],
      scopedRows: scopedRowsByFile[fileKey] ?? [],
      studentRowIndex,
    });

    if (removalPlan.mode === "virtual") {
      setFileStudentScopes((previous) => ({
        ...previous,
        [fileKey]: removalPlan.remainingRows,
      }));

      if (selectedStudentRow === studentRowIndex) {
        clearStudentUrl();

        setSelectedStudentRow(
          removalPlan.remainingRows[0] ?? null
        );
      }

      return;
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
      resetStudentDetailBaseline();
      setFilenameMatchIssues({});
      setFileStudentMatches({});
      setFileStudentScopes({});
      setPendingUploadFileKeys([]);
      invalidateAllAiTasks();
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
    resetStudentDetailBaseline();
    setFileStudentMatches({});
    setFileStudentScopes({});
    setPendingUploadFileKeys([]);
  };
  const handleSelectStudent = useCallback(async (
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
  }, [
    isExtracting,
    files.length,
    sessionStudentRowIndexes,
    invalidateAllAiTasks,
    clearResolutionState,
    clearFiles,
    reset,
    setLoadingStudentDetail,
    setFileStudentMatches,
    historyMap,
    setStudentDetailBaseline,
    restore,
  ]);

  useStudentUrlRestore({
    loadingStudents,
    students,
    onSelectStudent: handleSelectStudent,
  });

  const handleIgnoreFileStudent = ignoreFileStudent;

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
      const payload = buildSessionSavePayload({
        student: currentStudent,
        sessionStudentRowIndexes,
        currentFileKeys,
        scopedRowsByFile,
        fileExtractions,
      });
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
          return buildSessionSavePayload({
            student,
            sessionStudentRowIndexes,
            currentFileKeys,
            scopedRowsByFile,
            fileExtractions,
          });
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
    try {
      const result = await saveMany(payloads);
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