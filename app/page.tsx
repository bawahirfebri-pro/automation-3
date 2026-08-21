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
import {
  matchFileStudentLocally,
  type FileStudentMatch,
} from "@/lib/file-student-matcher";
import { normalizeStudentName } from "@/lib/student-matcher";
import {
  getStudentDetail,
  matchStudentName,
} from "@/lib/api/students";

import {
  getDocumentFileKey,
  useDocumentExtraction,
} from "@/hooks/use-document-extraction";
import { useDocumentFiles } from "@/hooks/use-document-files";
import { useExtractionHistory } from "@/hooks/use-extraction-history";
import { useStudents } from "@/hooks/use-students";
import { useSaveToSheet } from "@/hooks/use-save-to-sheet";

import type { StudentRecord } from "@/types/student";
import type { DocumentDisplayFile } from "@/types/document-file";

type SaveFeedbackStatus = "idle" | "success" | "error";

export default function Home() {
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [selectedStudentRow, setSelectedStudentRow] =
    useState<number | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] =
    useState(false);
  const [savingStudentId, setSavingStudentId] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<
    Record<string, SaveFeedbackStatus>
  >({});
  const [sessionStudentRowIndex, setSessionStudentRowIndex] =
    useState<number | null>(null);
  const [sessionConflict, setSessionConflict] = useState("");
  const [fileStudentMatches, setFileStudentMatches] = useState<
    Record<string, FileStudentMatch>
  >({});
  const [aiMatchingFileKeys, setAiMatchingFileKeys] =
    useState<string[]>([]);

  const studentRequestIdRef = useRef(0);
  const saveFeedbackTimersRef = useRef<Record<string, number>>({});
  const aiFileMatchKeysRef = useRef<Record<string, string>>({});
  const aiFileMatchRequestIdsRef = useRef<Record<string, number>>({});

  const {
    isExtracting,
    resultKk,
    resultAkta,
    modelUsedKk,
    modelUsedAkta,
    kkSource,
    aktaSource,
    processedFileKeys,
    documentTypes,
    fileExtractions,
    errorMsg,
    extract,
    removeFileExtraction,
    restore,
    reset,
  } = useDocumentExtraction();

  const {
    history,
    addOrUpdateHistory,
    markAsSaved,
  } = useExtractionHistory();

  const {
    students,
    loadingStudents,
    studentError,
    refreshStudents,
  } = useStudents();

  const { save } = useSaveToSheet();

  const {
    files,
    handleFileChange,
    handleRemoveFile,
    clearFiles,
  } = useDocumentFiles();

  /*
   * ============================================================
   * LOCAL HISTORY
   * ============================================================
   */

  const historyMap = useMemo(() => {
    return new Map(
      history.map((item) => [
        item.id,
        item,
      ])
    );
  }, [history]);

  /*
   * ============================================================
   * PER-FILE LOCAL MATCH PLAN
   * ============================================================
   */

  const fileMatchPlans = useMemo(() => {
    return Object.fromEntries(
      Object.entries(fileExtractions).map(
        ([fileKey, extraction]) => [
          fileKey,
          matchFileStudentLocally(
            extraction,
            students
          ),
        ]
      )
    );
  }, [
    fileExtractions,
    students,
  ]);

  const manualCandidateRows = useMemo(() => {
    return Object.fromEntries(
      Object.entries(fileMatchPlans).map(
        ([fileKey, plan]) => [
          fileKey,
          plan.pendingAi?.candidates ?? [],
        ]
      )
    );
  }, [fileMatchPlans]);

  /*
   * ============================================================
   * SYNC EXACT / FUZZY MATCHES
   *
   * AI dan manual match yang sudah valid jangan tertimpa lagi
   * oleh hasil local matcher "unmatched" saat re-render.
   * ============================================================
   */

  useEffect(() => {
    setFileStudentMatches((previous) => {
      const next: Record<
        string,
        FileStudentMatch
      > = {};

      Object.entries(fileMatchPlans).forEach(
        ([fileKey, plan]) => {
          if (plan.match.rowIndex !== null) {
            next[fileKey] = plan.match;
            return;
          }

          const previousMatch =
            previous[fileKey];

          if (
            (
              previousMatch?.source === "ai" ||
              previousMatch?.source === "manual"
            ) &&
            previousMatch.rowIndex !== null
          ) {
            next[fileKey] =
              previousMatch;
            return;
          }

          next[fileKey] =
            plan.match;
        }
      );

      return next;
    });
  }, [fileMatchPlans]);

  /*
   * ============================================================
   * PER-FILE AI MATCHING
   * ============================================================
   */

  useEffect(() => {
    Object.entries(fileMatchPlans).forEach(
      ([fileKey, plan]) => {
        if (!plan.pendingAi) return;

        const currentMatch =
          fileStudentMatches[fileKey];

        if (
          currentMatch?.source === "exact" ||
          currentMatch?.source === "fuzzy" ||
          currentMatch?.source === "ai" ||
          currentMatch?.source === "manual"
        ) {
          return;
        }

        const {
          detectedNames,
          candidates,
        } = plan.pendingAi;

        const matchKey =
          JSON.stringify({
            detectedNames,
            candidates,
          });

        if (
          aiFileMatchKeysRef.current[fileKey] ===
          matchKey
        ) {
          return;
        }

        aiFileMatchKeysRef.current[fileKey] =
          matchKey;

        const requestId =
          (
            aiFileMatchRequestIdsRef.current[
              fileKey
            ] || 0
          ) + 1;

        aiFileMatchRequestIdsRef.current[
          fileKey
        ] = requestId;

        setAiMatchingFileKeys(
          (previous) =>
            previous.includes(fileKey)
              ? previous
              : [
                  ...previous,
                  fileKey,
                ]
        );

        void matchStudentName(
          detectedNames,
          candidates
        )
          .then((result) => {
            if (
              aiFileMatchRequestIdsRef.current[
                fileKey
              ] !== requestId
            ) {
              return;
            }

            if (
              !result.matched ||
              result.rowIndex === null
            ) {
              setFileStudentMatches(
                (previous) => ({
                  ...previous,
                  [fileKey]: {
                    rowIndex: null,
                    source:
                      "unmatched",
                  },
                })
              );

              return;
            }

            const candidateExists =
              candidates.some(
                (candidate) =>
                  candidate.rowIndex ===
                  result.rowIndex
              );

            if (!candidateExists) {
              return;
            }

            const studentExists =
              students.some(
                (student) =>
                  student.rowIndex ===
                  result.rowIndex
              );

            if (!studentExists) {
              return;
            }

            setFileStudentMatches(
              (previous) => ({
                ...previous,
                [fileKey]: {
                  rowIndex:
                    result.rowIndex,
                  source: "ai",
                },
              })
            );
          })
          .catch((error) => {
            if (
              aiFileMatchRequestIdsRef.current[
                fileKey
              ] !== requestId
            ) {
              return;
            }

            console.error(
              `[AI File Match] ${fileKey}`,
              error
            );
          })
          .finally(() => {
            if (
              aiFileMatchRequestIdsRef.current[
                fileKey
              ] !== requestId
            ) {
              return;
            }

            setAiMatchingFileKeys(
              (previous) =>
                previous.filter(
                  (key) =>
                    key !== fileKey
                )
            );
          });
      }
    );
  }, [
    fileMatchPlans,
    fileStudentMatches,
    students,
  ]);

  const isAiMatching =
    aiMatchingFileKeys.length > 0;

  /*
   * ============================================================
   * CURRENT FILE KEYS
   *
   * Hanya state file yang masih benar-benar ada di antrean
   * yang boleh dipakai untuk menentukan session.
   * ============================================================
   */

  const currentFileKeys = useMemo(() => {
    return files.map((file) =>
      getDocumentFileKey(file)
    );
  }, [files]);

  const currentFileKeySet = useMemo(
    () =>
      new Set(currentFileKeys),
    [currentFileKeys]
  );

  /*
   * ============================================================
   * SESSION STUDENT
   * ============================================================
   */

  const matchedRowIndexes =
    useMemo(() => {
      return [
        ...new Set(
          currentFileKeys
            .map(
              (fileKey) =>
                fileStudentMatches[
                  fileKey
                ]?.rowIndex
            )
            .filter(
              (
                rowIndex
              ): rowIndex is number =>
                rowIndex !== null &&
                rowIndex !== undefined
            )
        ),
      ];
    }, [
      currentFileKeys,
      fileStudentMatches,
    ]);

  useEffect(() => {
    if (files.length === 0) {
      setSessionStudentRowIndex(
        null
      );
      setSessionConflict("");
      return;
    }

    if (
      matchedRowIndexes.length === 0
    ) {
      setSessionStudentRowIndex(
        null
      );
      setSessionConflict("");
      return;
    }

    if (
      matchedRowIndexes.length === 1
    ) {
      setSessionStudentRowIndex(
        matchedRowIndexes[0]
      );

      setSessionConflict("");
      return;
    }

    const names =
      matchedRowIndexes
        .map(
          (rowIndex) =>
            students.find(
              (student) =>
                student.rowIndex ===
                rowIndex
            )?.nama
        )
        .filter(
          (
            name
          ): name is string =>
            Boolean(name)
        );

    setSessionStudentRowIndex(
      null
    );

    setSessionConflict(
      `Dokumen terdeteksi milik siswa berbeda: ${names.join(
        ", "
      )}.`
    );
  }, [
    files.length,
    matchedRowIndexes,
    students,
  ]);

  const resolvedStudent =
    useMemo(() => {
      if (
        sessionStudentRowIndex ===
          null ||
        sessionConflict
      ) {
        return null;
      }

      return (
        students.find(
          (student) =>
            student.rowIndex ===
            sessionStudentRowIndex
        ) || null
      );
    }, [
      sessionStudentRowIndex,
      sessionConflict,
      students,
    ]);

  const resolvedStudentId =
    useMemo(() => {
      if (!resolvedStudent) {
        return "";
      }

      return extractStudentNameFromFilename(
        `${resolvedStudent.nama}_KK.pdf`
      );
    }, [resolvedStudent]);

  /*
   * ============================================================
   * SESSION VALIDITY
   * ============================================================
   */

  const missingExtractionFileKeys =
    useMemo(() => {
      return currentFileKeys.filter(
        (fileKey) =>
          !fileExtractions[fileKey]
      );
    }, [
      currentFileKeys,
      fileExtractions,
    ]);

  const unresolvedFileKeys =
    useMemo(() => {
      return currentFileKeys.filter(
        (fileKey) => {
          if (
            !fileExtractions[fileKey]
          ) {
            return false;
          }

          return (
            fileStudentMatches[
              fileKey
            ]?.rowIndex == null
          );
        }
      );
    }, [
      currentFileKeys,
      fileExtractions,
      fileStudentMatches,
    ]);

  const matchedSessionFileKeys =
    useMemo(() => {
      if (
        sessionStudentRowIndex ===
          null ||
        sessionConflict
      ) {
        return [];
      }

      return currentFileKeys.filter(
        (fileKey) =>
          fileStudentMatches[
            fileKey
          ]?.rowIndex ===
          sessionStudentRowIndex
      );
    }, [
      currentFileKeys,
      fileStudentMatches,
      sessionStudentRowIndex,
      sessionConflict,
    ]);

  /*
   * ============================================================
   * DUPLICATE DOCUMENT DETECTION
   *
   * Kalau ada 2 file yang sama-sama punya data KK atau
   * 2 file yang sama-sama punya data Akta untuk student yang sama,
   * kita tidak memilih "yang terakhir" secara diam-diam.
   * ============================================================
   */

  const matchedKkFileKeys =
    useMemo(() => {
      return matchedSessionFileKeys.filter(
        (fileKey) =>
          Boolean(
            fileExtractions[
              fileKey
            ]?.kk
          )
      );
    }, [
      matchedSessionFileKeys,
      fileExtractions,
    ]);

  const matchedAktaFileKeys =
    useMemo(() => {
      return matchedSessionFileKeys.filter(
        (fileKey) =>
          Boolean(
            fileExtractions[
              fileKey
            ]?.akta
          )
      );
    }, [
      matchedSessionFileKeys,
      fileExtractions,
    ]);

  const duplicateDocumentMsg =
    useMemo(() => {
      const duplicateTypes: string[] =
        [];

      if (
        matchedKkFileKeys.length > 1
      ) {
        duplicateTypes.push("KK");
      }

      if (
        matchedAktaFileKeys.length > 1
      ) {
        duplicateTypes.push(
          "Akta Kelahiran"
        );
      }

      if (
        duplicateTypes.length === 0
      ) {
        return "";
      }

      return `Terdapat lebih dari satu dokumen ${duplicateTypes.join(
        " dan "
      )} untuk siswa yang sama. Hapus dokumen duplikat sebelum menyimpan data.`;
    }, [
      matchedKkFileKeys,
      matchedAktaFileKeys,
    ]);

  /*
   * Session dianggap ready HANYA kalau:
   * - ada file
   * - extraction selesai
   * - AI matching selesai
   * - tidak conflict
   * - tidak duplicate
   * - semua file punya extraction
   * - semua file punya student match
   * - semua match menunjuk student yang sama
   */
  const sessionReady =
    files.length > 0 &&
    !isExtracting &&
    !isAiMatching &&
    !sessionConflict &&
    !duplicateDocumentMsg &&
    missingExtractionFileKeys.length ===
      0 &&
    unresolvedFileKeys.length === 0 &&
    resolvedStudent !== null &&
    matchedSessionFileKeys.length ===
      files.length;

  /*
   * ============================================================
   * SESSION EXTRACTIONS
   * ============================================================
   */

  const sessionExtractions =
    useMemo(() => {
      if (
        sessionStudentRowIndex ===
          null ||
        sessionConflict
      ) {
        return [];
      }

      return matchedSessionFileKeys
        .map(
          (fileKey) =>
            fileExtractions[
              fileKey
            ]
        )
        .filter(Boolean);
    }, [
      matchedSessionFileKeys,
      fileExtractions,
      sessionStudentRowIndex,
      sessionConflict,
    ]);

  /*
   * Karena duplicate sudah diblokir, find pertama aman.
   */
  const sessionKkExtraction =
    useMemo(() => {
      return (
        sessionExtractions.find(
          (item) => item.kk
        ) || null
      );
    }, [sessionExtractions]);

  const sessionAktaExtraction =
    useMemo(() => {
      return (
        sessionExtractions.find(
          (item) => item.akta
        ) || null
      );
    }, [sessionExtractions]);

  /*
   * ============================================================
   * ACTIVE PANEL DATA
   * ============================================================
   */

  const activeKk = useMemo(() => {
    if (files.length > 0) {
      return (
        sessionKkExtraction?.kk ||
        null
      );
    }

    return resultKk;
  }, [
    files.length,
    sessionKkExtraction,
    resultKk,
  ]);

  const activeAkta =
    useMemo(() => {
      if (files.length > 0) {
        return (
          sessionAktaExtraction?.akta ||
          null
        );
      }

      return resultAkta;
    }, [
      files.length,
      sessionAktaExtraction,
      resultAkta,
    ]);

  const activeModelUsedKk =
    useMemo(() => {
      if (files.length > 0) {
        return (
          sessionKkExtraction
            ?.modelUsedKk || ""
        );
      }

      return modelUsedKk;
    }, [
      files.length,
      sessionKkExtraction,
      modelUsedKk,
    ]);

  const activeModelUsedAkta =
    useMemo(() => {
      if (files.length > 0) {
        return (
          sessionAktaExtraction
            ?.modelUsedAkta || ""
        );
      }

      return modelUsedAkta;
    }, [
      files.length,
      sessionAktaExtraction,
      modelUsedAkta,
    ]);

  const activeStudentName =
    useMemo(() => {
      if (selectedHistoryId) {
        return selectedHistoryId;
      }

      return (
        resolvedStudent?.nama || ""
      );
    }, [
      selectedHistoryId,
      resolvedStudent,
    ]);

  /*
   * ============================================================
   * CANONICAL DISPLAY FILES
   *
   * Rename hanya jika FILE ITU SENDIRI match student session.
   * ============================================================
   */

  const displayFiles =
    useMemo<
      DocumentDisplayFile[]
    >(() => {
      return files.map((file) => {
        const fileKey =
          getDocumentFileKey(file);

        const documentType =
          documentTypes[fileKey] ||
          null;

        const fileMatch =
          fileStudentMatches[
            fileKey
          ];

        const canRename =
          resolvedStudent &&
          documentType &&
          !sessionConflict &&
          fileMatch?.rowIndex ===
            resolvedStudent.rowIndex;

        const canonicalName =
          canRename
            ? createCanonicalFileName(
                resolvedStudent.nama,
                documentType
              )
            : "";

        return {
          file,
          fileKey,
          originalName:
            file.name,
          displayName:
            canonicalName ||
            file.name,
          documentType,
          renamed:
            Boolean(
              canonicalName
            ) &&
            canonicalName !==
              file.name,
        };
      });
    }, [
      files,
      documentTypes,
      fileStudentMatches,
      resolvedStudent,
      sessionConflict,
    ]);

  /*
   * ============================================================
   * EXTRACTION QUEUE
   * ============================================================
   */

  const pendingFiles =
    useMemo(() => {
      const processed =
        new Set(
          processedFileKeys
        );

      return files.filter(
        (file) =>
          !processed.has(
            getDocumentFileKey(
              file
            )
          )
      );
    }, [
      files,
      processedFileKeys,
    ]);

  const hasPendingFiles =
    pendingFiles.length > 0;

  /*
   * ============================================================
   * SAVE FEEDBACK
   * ============================================================
   */

  const setTemporarySaveFeedback =
    (
      studentId: string,
      status: SaveFeedbackStatus
    ) => {
      const currentTimer =
        saveFeedbackTimersRef.current[
          studentId
        ];

      if (currentTimer) {
        window.clearTimeout(
          currentTimer
        );
      }

      setSaveFeedback(
        (previous) => ({
          ...previous,
          [studentId]:
            status,
        })
      );

      saveFeedbackTimersRef.current[
        studentId
      ] = window.setTimeout(
        () => {
          setSaveFeedback(
            (previous) => ({
              ...previous,
              [studentId]:
                "idle",
            })
          );

          delete saveFeedbackTimersRef
            .current[
            studentId
          ];
        },
        2000
      );
    };

  /*
   * ============================================================
   * STUDENT HIGHLIGHT
   * ============================================================
   */

  useEffect(() => {
    if (files.length === 0) {
      return;
    }

    setSelectedStudentRow(
      resolvedStudent?.rowIndex ??
        null
    );
  }, [
    files.length,
    resolvedStudent,
  ]);

  /*
   * ============================================================
   * HISTORY
   *
   * Jangan masukkan partial / unresolved / duplicate session.
   * ============================================================
   */

  useEffect(() => {
    if (
      !sessionReady ||
      !resolvedStudent ||
      !resolvedStudentId
    ) {
      return;
    }

    const kk =
      sessionKkExtraction?.kk ||
      null;

    const akta =
      sessionAktaExtraction?.akta ||
      null;

    if (!kk && !akta) {
      return;
    }

    addOrUpdateHistory({
      id: resolvedStudentId,
      studentName:
        resolvedStudent.nama,
      kk,
      akta,
      modelUsedKk:
        kk
          ? sessionKkExtraction
              ?.modelUsedKk || ""
          : "",
      modelUsedAkta:
        akta
          ? sessionAktaExtraction
              ?.modelUsedAkta || ""
          : "",
      updatedAt:
        new Date().toISOString(),
      savedToSheetAt:
        undefined,
    });
  }, [
    sessionReady,
    resolvedStudent,
    resolvedStudentId,
    sessionKkExtraction,
    sessionAktaExtraction,
    addOrUpdateHistory,
  ]);

  /*
   * ============================================================
   * AUTO EXTRACTION
   * ============================================================
   */

  useEffect(() => {
    if (
      files.length === 0 ||
      isExtracting ||
      pendingFiles.length === 0
    ) {
      return;
    }

    void extract(
      pendingFiles
    );
  }, [
    files,
    pendingFiles,
    isExtracting,
    extract,
  ]);

  /*
   * ============================================================
   * CLEANUP
   * ============================================================
   */

  useEffect(() => {
    const timers =
      saveFeedbackTimersRef.current;

    return () => {
      Object.values(
        timers
      ).forEach((timer) => {
        window.clearTimeout(
          timer
        );
      });
    };
  }, []);

  /*
   * ============================================================
   * UPLOAD
   * ============================================================
   */

  const handleUploadFileChange =
    (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const isNewUploadSession =
        files.length === 0;

      studentRequestIdRef.current +=
        1;

      setSelectedHistoryId("");
      setLoadingStudentDetail(
        false
      );

      if (
        isNewUploadSession
      ) {
        aiFileMatchKeysRef.current =
          {};

        aiFileMatchRequestIdsRef.current =
          {};

        setAiMatchingFileKeys(
          []
        );

        setSelectedStudentRow(
          null
        );

        setSessionStudentRowIndex(
          null
        );

        setSessionConflict("");

        setFileStudentMatches(
          {}
        );

        reset();
      }

      handleFileChange(
        event
      );
    };

  /*
   * ============================================================
   * MANUAL STUDENT RESOLUTION
   * ============================================================
   */

  const handleResolveFileStudent =
    (
      fileKey: string,
      rowIndex: number
    ) => {
      if (
        !currentFileKeySet.has(
          fileKey
        )
      ) {
        return;
      }

      const studentExists =
        students.some(
          (student) =>
            student.rowIndex ===
            rowIndex
        );

      if (!studentExists) {
        return;
      }

      aiFileMatchRequestIdsRef.current[
        fileKey
      ] =
        (
          aiFileMatchRequestIdsRef.current[
            fileKey
          ] || 0
        ) + 1;

      delete aiFileMatchKeysRef
        .current[
        fileKey
      ];

      setAiMatchingFileKeys(
        (previous) =>
          previous.filter(
            (key) =>
              key !== fileKey
          )
      );

      setFileStudentMatches(
        (previous) => ({
          ...previous,
          [fileKey]: {
            rowIndex,
            source: "manual",
          },
        })
      );
    };

  /*
   * ============================================================
   * REMOVE FILE
   * ============================================================
   */

  const handleRemoveUploadFile =
    (index: number) => {
      const file =
        files[index];

      if (!file) return;

      const fileKey =
        getDocumentFileKey(
          file
        );

      /*
       * Invalidate AI sebelum state file dibuang.
       */
      aiFileMatchRequestIdsRef.current[
        fileKey
      ] =
        (
          aiFileMatchRequestIdsRef.current[
            fileKey
          ] || 0
        ) + 1;

      delete aiFileMatchKeysRef
        .current[
        fileKey
      ];

      setAiMatchingFileKeys(
        (previous) =>
          previous.filter(
            (key) =>
              key !== fileKey
          )
      );

      removeFileExtraction(
        file
      );

      handleRemoveFile(
        index
      );

      setFileStudentMatches(
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

      /*
       * Kalau file terakhir dihapus,
       * seluruh identitas session harus ikut bersih.
       */
      if (
        files.length === 1
      ) {
        setSelectedHistoryId(
          ""
        );

        setSelectedStudentRow(
          null
        );

        setSessionStudentRowIndex(
          null
        );

        setSessionConflict(
          ""
        );

        setFileStudentMatches(
          {}
        );

        setAiMatchingFileKeys(
          []
        );
      }
    };

  /*
   * ============================================================
   * RESET SESSION
   * ============================================================
   */

  const handleResetUploadSession =
    () => {
      studentRequestIdRef.current +=
        1;

      aiFileMatchKeysRef.current =
        {};

      aiFileMatchRequestIdsRef.current =
        {};

      clearFiles();
      reset();

      setSelectedHistoryId("");
      setSelectedStudentRow(
        null
      );

      setLoadingStudentDetail(
        false
      );

      setSessionStudentRowIndex(
        null
      );

      setSessionConflict("");

      setFileStudentMatches(
        {}
      );

      setAiMatchingFileKeys(
        []
      );
    };

  /*
   * ============================================================
   * SELECT STUDENT PANEL
   * ============================================================
   */

  const handleSelectStudent =
    async (
      student: StudentRecord
    ) => {
      if (isExtracting) {
        return;
      }

      const requestId =
        ++studentRequestIdRef.current;

      aiFileMatchKeysRef.current =
        {};

      aiFileMatchRequestIdsRef.current =
        {};

      clearFiles();

      setSelectedStudentRow(
        student.rowIndex
      );

      setLoadingStudentDetail(
        false
      );

      setSessionStudentRowIndex(
        null
      );

      setSessionConflict("");

      setFileStudentMatches(
        {}
      );

      setAiMatchingFileKeys(
        []
      );

      const normalizedStudentName =
        extractStudentNameFromFilename(
          `${student.nama}_KK.pdf`
        );

      setSelectedHistoryId(
        normalizedStudentName
      );

      const localItem =
        historyMap.get(
          normalizedStudentName
        );

      if (localItem) {
        restore({
          kk: localItem.kk,
          akta:
            localItem.akta,
          modelUsedKk:
            localItem.modelUsedKk,
          modelUsedAkta:
            localItem.modelUsedAkta,
          kkSource:
            localItem.kk
              ? "extraction"
              : "none",
          aktaSource:
            localItem.akta
              ? "extraction"
              : "none",
        });

        return;
      }

      setLoadingStudentDetail(
        true
      );

      try {
        const detail =
          await getStudentDetail(
            student.rowIndex
          );

        if (
          requestId !==
          studentRequestIdRef.current
        ) {
          return;
        }

        restore({
          kk: detail.kk,
          akta: detail.akta,
          modelUsedKk: "",
          modelUsedAkta:
            "",
          kkSource:
            detail.kk
              ? "sheet"
              : "none",
          aktaSource:
            detail.akta
              ? "sheet"
              : "none",
        });
      } catch (error) {
        if (
          requestId !==
          studentRequestIdRef.current
        ) {
          return;
        }

        console.error(
          "[Student Detail]",
          error
        );

        reset();
      } finally {
        if (
          requestId ===
          studentRequestIdRef.current
        ) {
          setLoadingStudentDetail(
            false
          );
        }
      }
    };

  /*
   * ============================================================
   * SAVE TO GOOGLE SHEET
   *
   * HARDENING:
   * Jika ada upload aktif, source data WAJIB dari session aktif.
   * Jangan mengambil history lama.
   * ============================================================
   */

  const handleSaveStudent =
    async (
      student: StudentRecord
    ) => {
      if (
        savingStudentId ||
        sessionConflict ||
        duplicateDocumentMsg
      ) {
        return;
      }

      const currentStudent =
        students.find(
          (item) =>
            item.rowIndex ===
            student.rowIndex
        );

      if (!currentStudent) {
        return;
      }

      if (
        normalizeStudentName(
          currentStudent.nama
        ) !==
        normalizeStudentName(
          student.nama
        )
      ) {
        return;
      }

      const normalizedStudentName =
        extractStudentNameFromFilename(
          `${currentStudent.nama}_KK.pdf`
        );

      /*
       * ========================================================
       * MODE A: ADA UPLOAD AKTIF
       * ========================================================
       */
      if (files.length > 0) {
        if (
          !sessionReady ||
          !resolvedStudent ||
          resolvedStudent.rowIndex !==
            currentStudent.rowIndex
        ) {
          setTemporarySaveFeedback(
            normalizedStudentName,
            "error"
          );

          return;
        }

        const kkToSave =
          !currentStudent.kkComplete
            ? activeKk
            : null;

        const aktaToSave =
          !currentStudent.aktaComplete
            ? activeAkta
            : null;

        if (
          !kkToSave &&
          !aktaToSave
        ) {
          return;
        }

        setSavingStudentId(
          normalizedStudentName
        );

        try {
          const result =
            await save({
              rowIndex:
                currentStudent.rowIndex,
              extractedData:
                kkToSave,
              aktaData:
                aktaToSave,
              fileName:
                `${currentStudent.nama}_KK.pdf`,
            });

          if (
            !result.success
          ) {
            setTemporarySaveFeedback(
              normalizedStudentName,
              "error"
            );

            return;
          }

          if (
            resolvedStudentId
          ) {
            markAsSaved(
              resolvedStudentId
            );
          }

          await refreshStudents();

          setSelectedStudentRow(
            currentStudent.rowIndex
          );

          setTemporarySaveFeedback(
            normalizedStudentName,
            "success"
          );
        } catch (error) {
          console.error(
            "[Save Student Upload Session]",
            error
          );

          setTemporarySaveFeedback(
            normalizedStudentName,
            "error"
          );
        } finally {
          setSavingStudentId(
            ""
          );
        }

        return;
      }

      /*
       * ========================================================
       * MODE B: TIDAK ADA UPLOAD
       *
       * User membuka data dari history.
       * ========================================================
       */

      const localItem =
        historyMap.get(
          normalizedStudentName
        );

      if (!localItem) {
        return;
      }

      const kkToSave =
        !currentStudent.kkComplete &&
        localItem.kk
          ? localItem.kk
          : null;

      const aktaToSave =
        !currentStudent.aktaComplete &&
        localItem.akta
          ? localItem.akta
          : null;

      if (
        !kkToSave &&
        !aktaToSave
      ) {
        return;
      }

      const currentTimer =
        saveFeedbackTimersRef.current[
          normalizedStudentName
        ];

      if (currentTimer) {
        window.clearTimeout(
          currentTimer
        );

        delete saveFeedbackTimersRef
          .current[
          normalizedStudentName
        ];
      }

      setSaveFeedback(
        (previous) => ({
          ...previous,
          [normalizedStudentName]:
            "idle",
        })
      );

      setSavingStudentId(
        normalizedStudentName
      );

      try {
        const result =
          await save({
            rowIndex:
              currentStudent.rowIndex,
            extractedData:
              kkToSave,
            aktaData:
              aktaToSave,
            fileName:
              `${localItem.studentName}_KK.pdf`,
          });

        if (
          !result.success
        ) {
          setTemporarySaveFeedback(
            normalizedStudentName,
            "error"
          );

          return;
        }

        markAsSaved(
          localItem.id
        );

        await refreshStudents();

        setSelectedStudentRow(
          currentStudent.rowIndex
        );

        setTemporarySaveFeedback(
          normalizedStudentName,
          "success"
        );
      } catch (error) {
        console.error(
          "[Save Student History]",
          error
        );

        setTemporarySaveFeedback(
          normalizedStudentName,
          "error"
        );
      } finally {
        setSavingStudentId(
          ""
        );
      }
    };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <DashboardLayout>
      <DashboardContent>
        <section className="col-span-12 h-full lg:col-span-6">
          <UploadSection
            files={files}
            displayFiles={
              displayFiles
            }
            fileStudentMatches={
              fileStudentMatches
            }
            manualCandidateRows={
              manualCandidateRows
            }
            students={students}
            processedFileKeys={
              processedFileKeys
            }
            aiMatchingFileKeys={
              aiMatchingFileKeys
            }
            isExtracting={
              isExtracting
            }
            errorMsg={
              errorMsg
            }
            conflictMsg={
              sessionConflict
            }
            duplicateMsg={
              duplicateDocumentMsg
            }
            sessionReady={
              sessionReady
            }
            hasPendingFiles={
              hasPendingFiles
            }
            onFileChange={
              handleUploadFileChange
            }
            onRemoveFile={
              handleRemoveUploadFile
            }
            onResetSession={
              handleResetUploadSession
            }
            onResolveStudent={
              handleResolveFileStudent
            }
          />
        </section>

        <StudentPanel
          students={
            students
          }
          history={
            history
          }
          loading={
            loadingStudents
          }
          error={
            studentError
          }
          activeRowIndex={
            selectedStudentRow
          }
          savingStudentId={
            savingStudentId
          }
          saveFeedback={
            saveFeedback
          }
          onSelect={
            handleSelectStudent
          }
          onRefresh={
            refreshStudents
          }
          onSave={
            handleSaveStudent
          }
        />

        <AktaPanel
          data={
            activeAkta
          }
          modelUsed={
            activeModelUsedAkta
          }
        />

        <KkSummary
          data={
            activeKk
          }
          modelUsed={
            activeModelUsedKk
          }
        />

        <KkMembers
          data={
            activeKk
          }
          studentName={
            activeStudentName
          }
        />

        {(loadingStudentDetail ||
          isAiMatching) && (
          <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />

            {isAiMatching
              ? "Mencocokkan nama murid..."
              : "Memuat detail murid..."}
          </div>
        )}
      </DashboardContent>
    </DashboardLayout>
  );
}