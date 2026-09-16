import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { matchStudentName } from "@/lib/api/students";
import {
  createFileStudentMatch,
  type FileStudentMatch,
  matchFileStudentLocally,
} from "@/lib/students/file-student-matcher";

import { getFileResolutionState } from "@/features/student/lib/file-resolution-state";
import { reconcileFileStudentMatches } from "@/features/student/lib/reconcile-file-student-matches";
import {
  applyAiResolvedStudentMatch,
  isResolutionRowValid,
} from "@/features/student/lib/student-resolution-utils";

import type { FileExtractionState } from "@/types/extraction";
import type { ManualResolutionValue } from "@/types/manual-resolution";
import type { StudentRecord } from "@/types/student";

type AiTaskOutcomeStatus = "matched" | "rejected" | "failed";

interface AiTaskOutcome {
  status: AiTaskOutcomeStatus;
  payloadKey: string;
}

interface Params {
  currentFileKeys: string[];
  fileExtractions: Record<string, FileExtractionState>;
  students: StudentRecord[];
}

export function useFileStudentResolution({ currentFileKeys, fileExtractions, students }: Params) {
  const [fileStudentMatches, setFileStudentMatches] = useState<Record<string, FileStudentMatch>>(
    {},
  );

  const [aiMatchingTaskKeys, setAiMatchingTaskKeys] = useState<string[]>([]);

  const [aiTaskOutcomes, setAiTaskOutcomes] = useState<Record<string, AiTaskOutcome>>({});

  const [manualTaskResolutions, setManualTaskResolutions] = useState<
    Record<string, ManualResolutionValue>
  >({});

  const aiTaskPayloadKeysRef = useRef<Record<string, string>>({});

  const aiTaskRequestIdsRef = useRef<Record<string, number>>({});

  const currentFileKeySet = useMemo(() => new Set(currentFileKeys), [currentFileKeys]);

  const fileMatchPlans = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(fileExtractions).map(([fileKey, extraction]) => [
          fileKey,
          matchFileStudentLocally(extraction, students),
        ]),
      ),
    [fileExtractions, students],
  );

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;

      setFileStudentMatches((previous) =>
        reconcileFileStudentMatches({ previous, currentFileKeys, fileMatchPlans }),
      );
    });

    return () => {
      active = false;
    };
  }, [fileMatchPlans, currentFileKeys]);

  useEffect(() => {
    Object.entries(fileMatchPlans).forEach(([fileKey, plan]) => {
      if (!currentFileKeySet.has(fileKey)) {
        return;
      }

      plan.pendingAi?.tasks.forEach((task) => {
        const requestKey = `${fileKey}::${task.taskKey}`;

        const payloadKey = JSON.stringify({
          detectedNames: task.detectedNames,
          candidates: task.candidates,
        });

        const existingOutcome = aiTaskOutcomes[requestKey];

        if (existingOutcome?.payloadKey === payloadKey && existingOutcome.status !== "failed") {
          return;
        }

        if (aiTaskPayloadKeysRef.current[requestKey] === payloadKey) {
          return;
        }

        aiTaskPayloadKeysRef.current[requestKey] = payloadKey;

        const requestId = (aiTaskRequestIdsRef.current[requestKey] || 0) + 1;

        aiTaskRequestIdsRef.current[requestKey] = requestId;

        setAiMatchingTaskKeys((previous) =>
          previous.includes(requestKey) ? previous : [...previous, requestKey],
        );

        void matchStudentName(task.detectedNames, task.candidates)
          .then((result) => {
            if (aiTaskRequestIdsRef.current[requestKey] !== requestId) {
              return;
            }

            if (!result.matched || result.rowIndex === null) {
              setAiTaskOutcomes((previous) => ({
                ...previous,
                [requestKey]: { status: "rejected", payloadKey },
              }));

              return;
            }

            const matchedRowIndex = result.rowIndex;

            if (!isResolutionRowValid(matchedRowIndex, task.candidates, students)) {
              setAiTaskOutcomes((previous) => ({
                ...previous,
                [requestKey]: { status: "failed", payloadKey },
              }));

              return;
            }

            let collision = false;

            setFileStudentMatches((previous) => {
              const result = applyAiResolvedStudentMatch({
                previous,
                fileKey,
                baseRows: fileMatchPlans[fileKey]?.match.rowIndexes ?? [],
                rowIndex: matchedRowIndex,
              });

              collision = result.collision;

              return result.next;
            });

            setAiTaskOutcomes((previous) => ({
              ...previous,
              [requestKey]: { status: collision ? "failed" : "matched", payloadKey },
            }));
          })
          .catch((error) => {
            if (aiTaskRequestIdsRef.current[requestKey] !== requestId) {
              return;
            }

            console.error(`[AI KK Member Match] ${requestKey}`, error);

            setAiTaskOutcomes((previous) => ({
              ...previous,
              [requestKey]: { status: "failed", payloadKey },
            }));
          })
          .finally(() => {
            if (aiTaskRequestIdsRef.current[requestKey] !== requestId) {
              return;
            }

            setAiMatchingTaskKeys((previous) => previous.filter((key) => key !== requestKey));
          });
      });
    });
  }, [fileMatchPlans, fileStudentMatches, students, aiTaskOutcomes, currentFileKeySet]);

  const { aiMatchingFileKeys, isAiMatching, manualTasksByFile, fileResolutionComplete } =
    getFileResolutionState({
      aiMatchingTaskKeys,
      currentFileKeys,
      fileMatchPlans,
      aiTaskOutcomes,
      fileStudentMatches,
      fileExtractions,
      manualTaskResolutions,
    });

  const clearResolutionState = useCallback(() => {
    setAiTaskOutcomes({});
    setManualTaskResolutions({});
  }, []);

  const invalidateAllAiTasks = useCallback(() => {
    Object.keys(aiTaskRequestIdsRef.current).forEach((requestKey) => {
      aiTaskRequestIdsRef.current[requestKey] += 1;
    });

    aiTaskPayloadKeysRef.current = {};
    setAiMatchingTaskKeys([]);
  }, []);

  const invalidateAiTasksForFile = useCallback((fileKey: string) => {
    const prefix = `${fileKey}::`;

    Object.keys(aiTaskRequestIdsRef.current).forEach((requestKey) => {
      if (!requestKey.startsWith(prefix)) {
        return;
      }

      aiTaskRequestIdsRef.current[requestKey] += 1;

      delete aiTaskPayloadKeysRef.current[requestKey];
    });

    setAiMatchingTaskKeys((previous) =>
      previous.filter((requestKey) => !requestKey.startsWith(prefix)),
    );

    setAiTaskOutcomes((previous) => {
      const next = { ...previous };

      Object.keys(next).forEach((key) => {
        if (key.startsWith(prefix)) {
          delete next[key];
        }
      });

      return next;
    });

    setManualTaskResolutions((previous) => {
      const next = { ...previous };

      Object.keys(next).forEach((key) => {
        if (key.startsWith(prefix)) {
          delete next[key];
        }
      });

      return next;
    });
  }, []);

  const resolveFileStudent = useCallback(
    (fileKey: string, taskKey: string, rowIndex: number) => {
      if (!currentFileKeySet.has(fileKey)) {
        return;
      }

      const task = manualTasksByFile[fileKey]?.find((item) => item.taskKey === taskKey);

      if (!task) {
        return;
      }

      if (!isResolutionRowValid(rowIndex, task.candidates, students)) {
        return;
      }

      const alreadyClaimed = fileStudentMatches[fileKey]?.rowIndexes.includes(rowIndex);

      if (alreadyClaimed) {
        return;
      }

      setManualTaskResolutions((previous) => ({
        ...previous,
        [`${fileKey}::${taskKey}`]: { status: "matched", rowIndex },
      }));

      setFileStudentMatches((previous) => {
        const existingRows = previous[fileKey]?.rowIndexes ?? [];

        return {
          ...previous,
          [fileKey]: createFileStudentMatch([...existingRows, rowIndex], "manual"),
        };
      });
    },
    [currentFileKeySet, manualTasksByFile, students, fileStudentMatches],
  );

  const ignoreFileStudent = useCallback(
    (fileKey: string, taskKey: string) => {
      if (!currentFileKeySet.has(fileKey)) {
        return;
      }

      const task = manualTasksByFile[fileKey]?.find((item) => item.taskKey === taskKey);

      if (!task) {
        return;
      }

      setManualTaskResolutions((previous) => ({
        ...previous,
        [`${fileKey}::${taskKey}`]: { status: "not-enrolled", rowIndex: null },
      }));
    },
    [currentFileKeySet, manualTasksByFile],
  );

  return {
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
  };
}
