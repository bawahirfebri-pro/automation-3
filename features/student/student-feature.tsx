"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import DashboardContent from "@/components/dashboard/dashboard-content";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import type { StudentDomainTab } from "@/components/dashboard/student-domain-header";
import StudentDomainHeader from "@/components/dashboard/student-domain-header";

import { useSaveFeedback } from "@/hooks/use-save-feedback";
import { useStudents } from "@/hooks/use-students";

import { getStudentDetail } from "@/lib/api/students";
import { getDocumentFileKey } from "@/lib/documents/document-file-key";
import { dedupeDocumentFiles } from "@/lib/documents/document-helpers";
import { extractStudentNameFromFilename } from "@/lib/documents/document-name";
import { createFileStudentMatch } from "@/lib/students/file-student-matcher";
import { normalizeStudentName } from "@/lib/students/student-matcher";
import { getStudentRouteView, setStudentUrl } from "@/lib/students/student-url";

import { useDocumentExtraction } from "@/features/student/hooks/use-document-extraction";
import { useDocumentFiles } from "@/features/student/hooks/use-document-files";
import { useExtractionHistory } from "@/features/student/hooks/use-extraction-history";
import { useFileStudentResolution } from "@/features/student/hooks/use-file-student-resolution";
import { usePendingDocumentExtraction } from "@/features/student/hooks/use-pending-document-extraction";
import { useSessionHistorySync } from "@/features/student/hooks/use-session-history-sync";
import { useSessionReadiness } from "@/features/student/hooks/use-session-readiness";
import { useSessionStudentSelection } from "@/features/student/hooks/use-session-student-selection";
import { useSessionUrlSync } from "@/features/student/hooks/use-session-url-sync";
import { useStudentDetailBaseline } from "@/features/student/hooks/use-student-detail-baseline";
import { useStudentSave } from "@/features/student/hooks/use-student-save";
import { useStudentUrlRestore } from "@/features/student/hooks/use-student-url-restore";

import { getActiveDocumentView } from "@/features/student/lib/active-document-view";
import { analyzeUploadStudentFilenames } from "@/features/student/lib/analyze-upload-student-filenames";
import { buildHistorySavePayload } from "@/features/student/lib/build-history-save-payload";
import { buildDocumentDisplayFiles } from "@/features/student/lib/document-display-files";
import { preprocessUploadFiles } from "@/features/student/lib/documents/preprocess-upload-files";
import { planDuplicateAktaFiles } from "@/features/student/lib/duplicate-akta-planner";
import {
  type FilenameMatchIssue,
  getFilenameMatchIssues,
} from "@/features/student/lib/get-filename-match-issues";
import { getPendingUploadBatchState } from "@/features/student/lib/get-pending-upload-batch-state";
import { getUploadFastPathState } from "@/features/student/lib/get-upload-fast-path-state";
import { planPendingUploadTransition } from "@/features/student/lib/pending-upload-transition";
import { planSavedStudentSessionCleanup } from "@/features/student/lib/saved-student-session-cleanup";
import { getSessionDocumentState } from "@/features/student/lib/session-document-state";
import { buildSessionSavePayload } from "@/features/student/lib/session-save-payload";
import { getStudentFileMembership } from "@/features/student/lib/student-file-membership";
import { planUploadSessionMerge } from "@/features/student/lib/upload-session-planner";
import { getUploadTransitionMode } from "@/features/student/lib/upload-transition-mode";

import type { StudentRecord } from "@/types/student";

import StudentProfile from "@/features/student/profile/student-profile";
import StudentSidebar from "@/features/student/student-list/student-sidebar";
import PendingUploadTray from "@/features/student/upload/pending-upload-tray";

export default function StudentFeature() {
  const pathname = usePathname();
  const activeDomainTab: StudentDomainTab = getStudentRouteView(pathname);

  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [selectedStudentRow, setSelectedStudentRow] = useState<number | null>(null);
  const [savingStudentId, setSavingStudentId] = useState("");
  const [detectedFileKeys, setDetectedFileKeys] = useState<string[]>([]);
  const [detectedStudentRowIndexes, setDetectedStudentRowIndexes] = useState<number[]>([]);
  const [fileStudentScopes, setFileStudentScopes] = useState<Record<string, number[]>>({});
  const [pendingUploadFileKeys, setPendingUploadFileKeys] = useState<string[]>([]);

  const { setTemporarySaveFeedback } = useSaveFeedback();

  const studentRequestIdRef = useRef(0);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const navigateToProfileAfterUploadRef = useRef(false);

  const {
    isExtracting,
    resultKk,
    resultAkta,
    modelUsedKk,
    modelUsedAkta,
    processedFileKeys,
    failedFileKeys,
    documentTypes,
    fileExtractions,
    extract,
    removeFileExtraction,
    restore,
    reset,
  } = useDocumentExtraction();

  const { history, addOrUpdateHistory, markAsSaved } = useExtractionHistory();
  const { students, loadingStudents, studentError, refreshStudents } = useStudents();
  const { saving: savingAll, save } = useStudentSave();
  const { files, clearFiles, replaceFiles } = useDocumentFiles();

  const historyMap = useMemo(() => new Map(history.map((item) => [item.id, item])), [history]);
  const [filenameMatchIssues, setFilenameMatchIssues] = useState<
    Record<string, FilenameMatchIssue>
  >({});

  const currentFileKeys = useMemo(() => files.map((file) => getDocumentFileKey(file)), [files]);
  const currentFileKeySet = useMemo(() => new Set(currentFileKeys), [currentFileKeys]);
  const hasUnsavedPending = files.length > 0;

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
  } = useFileStudentResolution({ currentFileKeys, fileExtractions, students });

  useEffect(() => {
    const nextIssues = getFilenameMatchIssues({
      currentFileKeys,
      processedFileKeys,
      fileExtractions,
      students,
    });

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

      setFilenameMatchIssues(nextIssues);
    });

    return () => {
      active = false;
    };
  }, [currentFileKeys, processedFileKeys, fileExtractions, students]);

  useEffect(() => {
    const duplicateFileKeys = planDuplicateAktaFiles({
      files,
      processedFileKeys,
      fileExtractions,
      filenameMatchIssues,
    });

    if (duplicateFileKeys.length === 0) {
      return;
    }

    const duplicateKeys = new Set(duplicateFileKeys);

    const duplicateFiles = files.filter((file) => duplicateKeys.has(getDocumentFileKey(file)));

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

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
        previous.filter((fileKey) => !duplicateKeys.has(fileKey)),
      );

      setDetectedFileKeys((previous) => previous.filter((fileKey) => !duplicateKeys.has(fileKey)));

      replaceFiles(files.filter((file) => !duplicateKeys.has(getDocumentFileKey(file))));
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

  const { rawRowsByFile, scopedRowsByFile } = useMemo(
    () => getStudentFileMembership({ currentFileKeys, fileStudentMatches, fileStudentScopes }),
    [currentFileKeys, fileStudentMatches, fileStudentScopes],
  );

  const {
    sessionStudentRowIndexes,
    sessionStudents,
    sessionConflict,
    duplicateDocumentMsg,
    sessionReady,
  } = useSessionReadiness({
    filesLength: files.length,
    currentFileKeys,
    scopedRowsByFile,
    fileExtractions,
    fileStudentMatches,
    fileResolutionComplete,
    failedFileKeys,
    students,
    pendingUploadFileKeys,
    isExtracting,
    isAiMatching,
  });

  useEffect(() => {
    const rows =
      detectedFileKeys.length === 0
        ? []
        : [
            ...new Set(
              detectedFileKeys
                .filter((fileKey) => currentFileKeySet.has(fileKey))
                .flatMap((fileKey) => scopedRowsByFile[fileKey] ?? []),
            ),
          ];

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

      setDetectedStudentRowIndexes((previous) => {
        if (
          previous.length === rows.length &&
          previous.every((rowIndex, index) => rowIndex === rows[index])
        ) {
          return previous;
        }

        return rows;
      });
    });

    return () => {
      active = false;
    };
  }, [detectedFileKeys, currentFileKeySet, scopedRowsByFile]);

  const primarySessionStudent = useMemo(() => {
    if (selectedStudentRow !== null) {
      const selectedStudent =
        students.find((student) => student.rowIndex === selectedStudentRow) ?? null;

      if (selectedStudent) {
        return selectedStudent;
      }
    }

    if (files.length > 0) {
      return sessionStudents[0] ?? null;
    }

    return null;
  }, [files.length, selectedStudentRow, sessionStudents, students]);

  const {
    studentDetailBaseline,
    setStudentDetailBaseline,
    loadingStudentDetail,
    setLoadingStudentDetail,
    resetStudentDetailBaseline,
  } = useStudentDetailBaseline({ filesLength: files.length, primarySessionStudent, history });

  const failedFileKeySet = useMemo(() => new Set(failedFileKeys), [failedFileKeys]);

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

  const { activeKk, activeAkta, activeModelUsedKk } = getActiveDocumentView({
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

  const { hasPendingFiles } = usePendingDocumentExtraction({
    files,
    processedFileKeys,
    isExtracting,
    extract,
  });

  useSessionHistorySync({
    sessionReady,
    sessionStudents,
    currentFileKeys,
    scopedRowsByFile,
    fileExtractions,
    studentDetailBaseline,
    history,
    addOrUpdateHistory,
  });

  useSessionUrlSync({
    filesLength: files.length,
    primarySessionStudent,
    isPreprocessing,
    isExtracting,
    hasPendingFiles,
  });

  useSessionStudentSelection({
    filesLength: files.length,
    sessionStudents,
    selectedStudentRow,
    setSelectedStudentRow,
  });

  useEffect(() => {
    if (!navigateToProfileAfterUploadRef.current) return;
    if (isPreprocessing || isExtracting) return;
    if (!primarySessionStudent) return;

    setStudentUrl(primarySessionStudent.nik);
    navigateToProfileAfterUploadRef.current = false;
  }, [primarySessionStudent, isPreprocessing, isExtracting]);

  useEffect(() => {
    if (!hasUnsavedPending) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedPending]);

  const handleOpenUploadPicker = () => {
    uploadInputRef.current?.click();
  };

  const handleUploadFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFiles = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (pickedFiles.length === 0) {
      return;
    }

    navigateToProfileAfterUploadRef.current = true;
    setIsPreprocessing(true);

    try {
      const selectedFiles = await preprocessUploadFiles(pickedFiles);

      if (selectedFiles.length === 0) {
        navigateToProfileAfterUploadRef.current = false;
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
      } = analyzeUploadStudentFilenames(selectedFiles, students);

      const fastPathState =
        files.length > 0
          ? getUploadFastPathState({
              selectedFiles,
              students,
              currentFileKeys,
              fileExtractions,
              fileResolutionComplete,
              aiMatchingFileKeys,
            })
          : { canUseFilenameFastPath: false, incomingRows: [] as number[] };

      const uploadTransitionMode = getUploadTransitionMode({
        allSelectedNotFound,
        existingFilesLength: files.length,
        canUseFilenameFastPath: fastPathState.canUseFilenameFastPath,
      });

      if (uploadTransitionMode === "replace-unmatched") {
        navigateToProfileAfterUploadRef.current = false;

        invalidateAllAiTasks();
        clearResolutionState();

        files.forEach((file) => {
          const fileKey = getDocumentFileKey(file);

          invalidateAiTasksForFile(fileKey);

          removeFileExtraction(file);
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

        setFilenameMatchIssues(Object.fromEntries(filenameIssueEntries));

        replaceFiles(selectedFiles);

        return;
      }

      if (uploadTransitionMode === "replace-initial") {
        const baselineRowIndex = selectedStudentRow;

        if (baselineRowIndex !== null && (resultKk || resultAkta)) {
          setStudentDetailBaseline({
            rowIndex: baselineRowIndex,
            kk: resultKk,
            akta: resultAkta,
            modelUsedKk,
            modelUsedAkta,
          });
        }

        invalidateAllAiTasks();
        clearResolutionState();
        reset();

        setFileStudentMatches(
          Object.fromEntries(
            immediateNamedMatches.map(({ fileKey, rowIndex }) => [
              fileKey,
              createFileStudentMatch([rowIndex], "exact"),
            ]),
          ),
        );

        setFileStudentScopes({});
        setPendingUploadFileKeys([]);
        setDetectedFileKeys(selectedKeys);

        if (immediateNamedRows.length > 0) {
          setDetectedStudentRowIndexes(immediateNamedRows);

          setSelectedStudentRow(immediateNamedRows[0]);
        } else {
          setDetectedStudentRowIndexes([]);
        }

        replaceFiles(selectedFiles);

        return;
      }

      const { incomingRows } = fastPathState;

      if (uploadTransitionMode === "merge-fast") {
        const initialScopes = { ...fileStudentScopes };

        immediateNamedMatches.forEach(({ fileKey, rowIndex }) => {
          initialScopes[fileKey] = [rowIndex];
        });

        const { keptOldFiles, removedOldFiles, nextScopes } = planUploadSessionMerge({
          existingFiles: files,
          incomingRows,
          rawRowsByFile,
          initialScopes,
        });

        removedOldFiles.forEach((file) => {
          const fileKey = getDocumentFileKey(file);

          invalidateAiTasksForFile(fileKey);

          removeFileExtraction(file);
        });

        const removedKeys = new Set(removedOldFiles.map(getDocumentFileKey));

        setFileStudentMatches((previous) => {
          const next = { ...previous };

          removedKeys.forEach((fileKey) => {
            delete next[fileKey];
          });

          immediateNamedMatches.forEach(({ fileKey, rowIndex }) => {
            next[fileKey] = createFileStudentMatch([rowIndex], "exact");
          });

          return next;
        });

        const finalFiles = dedupeDocumentFiles([...keptOldFiles, ...selectedFiles]);

        const finalKeys = finalFiles.map(getDocumentFileKey);

        setFileStudentScopes(nextScopes);

        setPendingUploadFileKeys(selectedKeys);

        setDetectedFileKeys(finalKeys);

        setDetectedStudentRowIndexes(incomingRows);

        setSelectedStudentRow(incomingRows[0] ?? null);

        replaceFiles(finalFiles);

        return;
      }

      if (uploadTransitionMode === "append-pending") {
        if (immediateNamedMatches.length > 0) {
          setFileStudentMatches((previous) => {
            const next = { ...previous };

            immediateNamedMatches.forEach(({ fileKey, rowIndex }) => {
              next[fileKey] = createFileStudentMatch([rowIndex], "exact");
            });

            return next;
          });

          setDetectedStudentRowIndexes(immediateNamedRows);

          setSelectedStudentRow(immediateNamedRows[0] ?? null);
        }

        setPendingUploadFileKeys((previous) => [...new Set([...previous, ...selectedKeys])]);

        setDetectedFileKeys([...new Set([...currentFileKeys, ...selectedKeys])]);

        replaceFiles(dedupeDocumentFiles([...files, ...selectedFiles]));
      }
    } finally {
      setIsPreprocessing(false);
    }
  };

  useEffect(() => {
    if (pendingUploadFileKeys.length === 0) return;

    const { incomingFiles, incomingReady, incomingRows, hasMatchedIncomingStudent } =
      getPendingUploadBatchState({
        pendingUploadFileKeys,
        files,
        fileExtractions,
        documentTypes,
        fileResolutionComplete,
        aiMatchingFileKeys,
        failedFileKeySet,
        rawRowsByFile,
      });

    if (!incomingReady) return;

    const transition = planPendingUploadTransition({
      files,
      pendingUploadFileKeys,
      incomingFiles,
      incomingRows,
      hasMatchedIncomingStudent,
      rawRowsByFile,
      fileStudentScopes,
      selectedStudentRow,
    });

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

      if (transition.mode === "replace-incoming") {
        transition.oldFiles.forEach((file) => {
          const fileKey = getDocumentFileKey(file);

          invalidateAiTasksForFile(fileKey);
          removeFileExtraction(file);
        });

        setFileStudentMatches((previous) => {
          const next = { ...previous };

          transition.oldFileKeys.forEach((fileKey) => {
            delete next[fileKey];
          });

          return next;
        });

        setFileStudentScopes(transition.nextScopes);
        setPendingUploadFileKeys([]);
        setDetectedFileKeys(transition.finalFileKeys);
        setDetectedStudentRowIndexes([]);

        setSelectedHistoryId("");
        setSelectedStudentRow(transition.nextSelectedStudentRow);
        resetStudentDetailBaseline();

        replaceFiles(transition.finalFiles);

        navigateToProfileAfterUploadRef.current = false;
        return;
      }

      transition.removedOldFiles.forEach((file) => {
        const fileKey = getDocumentFileKey(file);

        invalidateAiTasksForFile(fileKey);
        removeFileExtraction(file);
      });

      if (transition.removedOldFileKeys.length > 0) {
        setFileStudentMatches((previous) => {
          const next = { ...previous };

          transition.removedOldFileKeys.forEach((fileKey) => {
            delete next[fileKey];
          });

          return next;
        });
      }

      setFileStudentScopes(transition.nextScopes);
      setDetectedFileKeys(transition.finalFileKeys);
      setPendingUploadFileKeys([]);
      replaceFiles(transition.finalFiles);

      if (selectedStudentRow !== transition.nextSelectedStudentRow) {
        setSelectedStudentRow(transition.nextSelectedStudentRow);
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

  const resetActiveSessionState = useCallback(() => {
    navigateToProfileAfterUploadRef.current = false;
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
    setFilenameMatchIssues({});
  }, [
    invalidateAllAiTasks,
    clearResolutionState,
    clearFiles,
    reset,
    resetStudentDetailBaseline,
    setFileStudentMatches,
  ]);

  const handleSelectStudent = useCallback(
    async (student: StudentRecord) => {
      if (isExtracting) {
        return;
      }

      setStudentUrl(student.nik);

      if (files.length > 0 && sessionStudentRowIndexes.includes(student.rowIndex)) {
        setSelectedStudentRow(student.rowIndex);
        setSelectedHistoryId("");
        return;
      }

      if (files.length === 0) {
        resetActiveSessionState();
      }

      const requestId = ++studentRequestIdRef.current;

      setSelectedStudentRow(student.rowIndex);
      setLoadingStudentDetail(false);

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
          kkSource: localItem.kk ? "extraction" : "none",
          aktaSource: localItem.akta ? "extraction" : "none",
        });

        return;
      }

      setLoadingStudentDetail(true);

      try {
        const detail = await getStudentDetail(student.rowIndex);

        if (requestId !== studentRequestIdRef.current) {
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
          kkSource: detail.kk ? "stored" : "none",
          aktaSource: detail.akta ? "stored" : "none",
        });
      } catch (error) {
        if (requestId !== studentRequestIdRef.current) {
          return;
        }

        console.error("[Student Detail]", error);
        reset();
      } finally {
        if (requestId === studentRequestIdRef.current) {
          setLoadingStudentDetail(false);
        }
      }
    },
    [
      isExtracting,
      files.length,
      sessionStudentRowIndexes,
      resetActiveSessionState,
      reset,
      setLoadingStudentDetail,
      historyMap,
      setStudentDetailBaseline,
      restore,
    ],
  );

  useStudentUrlRestore({ loadingStudents, students, onSelectStudent: handleSelectStudent });

  const getStudentSavePayload = useCallback(
    (student: StudentRecord) => {
      const normalizedStudentName = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);

      if (files.length > 0) {
        return buildSessionSavePayload({
          student,
          sessionStudentRowIndexes,
          currentFileKeys,
          scopedRowsByFile,
          fileExtractions,
        });
      }

      const localItem = historyMap.get(normalizedStudentName);

      if (!localItem) {
        return null;
      }

      return buildHistorySavePayload({
        student,
        historyItem: localItem,
        fileName: `${localItem.studentName}_KK.pdf`,
      });
    },
    [
      files.length,
      sessionStudentRowIndexes,
      currentFileKeys,
      scopedRowsByFile,
      fileExtractions,
      historyMap,
    ],
  );

  const cleanupSavedStudentSession = (studentRowIndex: number) => {
    if (files.length === 0) {
      return;
    }

    const { nextScopes, removedFileKeys } = planSavedStudentSessionCleanup({
      studentRowIndex,
      currentFileKeys,
      fileStudentScopes,
      rawRowsByFile,
      scopedRowsByFile,
      fileExtractions,
    });

    setFileStudentScopes(nextScopes);

    if (removedFileKeys.length === 0) {
      return;
    }

    const removedFileKeySet = new Set(removedFileKeys);

    files.forEach((file) => {
      const fileKey = getDocumentFileKey(file);

      if (!removedFileKeySet.has(fileKey)) {
        return;
      }

      invalidateAiTasksForFile(fileKey);
      removeFileExtraction(file);
    });

    setFileStudentMatches((previous) => {
      const next = { ...previous };

      removedFileKeySet.forEach((fileKey) => {
        delete next[fileKey];
      });

      return next;
    });

    setFilenameMatchIssues((previous) => {
      const next = { ...previous };

      removedFileKeySet.forEach((fileKey) => {
        delete next[fileKey];
      });

      return next;
    });

    setPendingUploadFileKeys((previous) =>
      previous.filter((fileKey) => !removedFileKeySet.has(fileKey)),
    );

    setDetectedFileKeys((previous) =>
      previous.filter((fileKey) => !removedFileKeySet.has(fileKey)),
    );

    replaceFiles(files.filter((file) => !removedFileKeySet.has(getDocumentFileKey(file))));
  };

  const handleSaveStudent = async (student: StudentRecord) => {
    if (savingStudentId || savingAll || sessionConflict || duplicateDocumentMsg) {
      return;
    }

    const currentStudent = students.find((item) => item.rowIndex === student.rowIndex);

    if (!currentStudent) {
      return;
    }

    if (normalizeStudentName(currentStudent.nama) !== normalizeStudentName(student.nama)) {
      return;
    }

    const normalizedStudentName = extractStudentNameFromFilename(`${currentStudent.nama}_KK.pdf`);
    const payload = getStudentSavePayload(currentStudent);

    if (!payload) {
      if (files.length > 0) {
        console.warn("[Save Student] Tidak ada data yang dapat disimpan untuk murid:", {
          rowIndex: currentStudent.rowIndex,
          nama: currentStudent.nama,
        });

        setTemporarySaveFeedback(normalizedStudentName, "error");
      }

      return;
    }

    const saveSource = files.length > 0 ? "Upload Session" : "History";

    setSavingStudentId(normalizedStudentName);

    try {
      const result = await save(payload);

      if (!result.success) {
        console.error(`[Save Student ${saveSource}] API gagal menyimpan:`, {
          student: currentStudent.nama,
          rowIndex: currentStudent.rowIndex,
          message: result.message,
        });

        setTemporarySaveFeedback(normalizedStudentName, "error");

        return;
      }

      markAsSaved(normalizedStudentName);

      if (files.length > 0) {
        cleanupSavedStudentSession(currentStudent.rowIndex);
      }

      await refreshStudents();

      setSelectedStudentRow(currentStudent.rowIndex);

      setTemporarySaveFeedback(normalizedStudentName, "success");
    } catch (error) {
      console.error(`[Save Student ${saveSource}]`, error);

      setTemporarySaveFeedback(normalizedStudentName, "error");
    } finally {
      setSavingStudentId("");
    }
  };

  const profileSavePayload = primarySessionStudent
    ? getStudentSavePayload(primarySessionStudent)
    : null;

  const profileStudentId = primarySessionStudent
    ? extractStudentNameFromFilename(`${primarySessionStudent.nama}_KK.pdf`)
    : "";

  const isSavingProfileStudent = Boolean(profileStudentId) && savingStudentId === profileStudentId;

  const canSaveProfileStudent =
    Boolean(profileSavePayload) &&
    !savingStudentId &&
    !savingAll &&
    !sessionConflict &&
    !duplicateDocumentMsg;

  const handleDomainTabChange = (tab: StudentDomainTab) => {
    if (tab !== "profile") return;

    const activeStudent =
      primarySessionStudent ??
      (selectedStudentRow !== null
        ? (students.find((student) => student.rowIndex === selectedStudentRow) ?? null)
        : null);

    if (!activeStudent) return;

    setStudentUrl(activeStudent.nik);
  };

  return (
    <DashboardLayout
      activeDomain="students"
      rightSidebar={
        <StudentSidebar
          students={students}
          history={history}
          loading={loadingStudents}
          error={studentError}
          activeRowIndex={selectedStudentRow}
          priorityRowIndexes={detectedStudentRowIndexes}
          footer={
            files.length > 0 ? (
              <PendingUploadTray
                displayFiles={displayFiles}
                processedFileKeys={processedFileKeys}
                failedFileKeys={failedFileKeys}
                aiMatchingFileKeys={aiMatchingFileKeys}
                filenameMatchIssues={filenameMatchIssues}
                fileStudentMatches={fileStudentMatches}
                manualTasks={manualTasksByFile}
                manualTaskResolutions={manualTaskResolutions}
                students={students}
                onResetSession={resetActiveSessionState}
                onResolveStudent={resolveFileStudent}
                onIgnoreStudent={ignoreFileStudent}
              />
            ) : null
          }
          onSelect={handleSelectStudent}
          onRefresh={refreshStudents}
        />
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <input
          ref={uploadInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={handleUploadFileChange}
        />

        <StudentDomainHeader
          activeTab={activeDomainTab}
          canOpenProfile={Boolean(primarySessionStudent)}
          onTabChange={handleDomainTabChange}
          onUpload={handleOpenUploadPicker}
          isUploading={isPreprocessing || isExtracting}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-3">
          <DashboardContent>
            <StudentProfile
              student={primarySessionStudent}
              kk={activeKk}
              akta={activeAkta}
              modelUsedKk={activeModelUsedKk}
              isLoading={loadingStudentDetail}
              isAiMatching={isAiMatching}
              canSave={canSaveProfileStudent}
              isSaving={isSavingProfileStudent}
              onSave={() => {
                if (!primarySessionStudent) return;
                void handleSaveStudent(primarySessionStudent);
              }}
            />
          </DashboardContent>
        </div>
      </div>
    </DashboardLayout>
  );
}
