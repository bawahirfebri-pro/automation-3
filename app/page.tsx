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
function getUploadStudentKey(file: File): string {
    const base = file.name
        .replace(/\.pdf$/i, "")
        .replace(/[\s_-]+(?:kk|kartu[\s_-]*keluarga|akta(?:[\s_-]*kelahiran)?)$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return normalizeStudentName(base);
}
function uploadMatchesStudentRows(file: File, rowIndexes: number[], students: StudentRecord[]): boolean {
    if (rowIndexes.length === 0)
        return false;
    const uploadKey = getUploadStudentKey(file);
    if (!uploadKey)
        return false;
    const matches = rowIndexes
        .map((rowIndex) => students.find((student) => student.rowIndex === rowIndex))
        .filter((student): student is StudentRecord => Boolean(student))
        .filter((student) => {
        const studentKey = normalizeStudentName(student.nama);
        return studentKey === uploadKey || studentKey.startsWith(`${uploadKey} `) || uploadKey.startsWith(`${studentKey} `);
    });
    return matches.length === 1;
}
export default function Home() {
    const [selectedHistoryId, setSelectedHistoryId] = useState("");
    const [selectedStudentRow, setSelectedStudentRow] = useState<number | null>(null);
    const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
    const [savingStudentId, setSavingStudentId] = useState("");
    const [saveFeedback, setSaveFeedback] = useState<Record<string, SaveFeedbackStatus>>({});
    const [fileStudentMatches, setFileStudentMatches] = useState<Record<string, FileStudentMatch>>({});
    const [aiMatchingTaskKeys, setAiMatchingTaskKeys] = useState<string[]>([]);
    const [aiTaskOutcomes, setAiTaskOutcomes] = useState<Record<string, AiTaskOutcome>>({});
    const [manualTaskResolutions, setManualTaskResolutions] = useState<Record<string, ManualResolutionValue>>({});
    const [detectedFileKeys, setDetectedFileKeys] = useState<string[]>([]);
    const [detectedStudentRowIndexes, setDetectedStudentRowIndexes] = useState<number[]>([]);
    const studentRequestIdRef = useRef(0);
    const saveFeedbackTimersRef = useRef<Record<string, number>>({});
    const aiTaskPayloadKeysRef = useRef<Record<string, string>>({});
    const aiTaskRequestIdsRef = useRef<Record<string, number>>({});
    const { isExtracting, resultKk, resultAkta, modelUsedKk, modelUsedAkta, processedFileKeys, documentTypes, fileExtractions, errorMsg, extract, removeFileExtraction, restore, reset, } = useDocumentExtraction();
    const { history, addOrUpdateHistory, markAsSaved } = useExtractionHistory();
    const { students, loadingStudents, studentError, refreshStudents } = useStudents();
    const { saving: savingAll, save, saveMany } = useSaveToSheet();
    const { files, handleRemoveFile, clearFiles, replaceFiles } = useDocumentFiles();
    const historyMap = useMemo(() => new Map(history.map((item) => [item.id, item])), [history]);
    const historyRef = useRef(history);
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
        setFileStudentMatches((previous) => {
            const next: Record<string, FileStudentMatch> = {};
            Object.entries(fileMatchPlans).forEach(([fileKey, plan]) => {
                const previousMatch = previous[fileKey];
                const previousRows = previousMatch?.rowIndexes ?? [];
                if (previousMatch?.source === "ai" ||
                    previousMatch?.source === "manual") {
                    next[fileKey] = createFileStudentMatch([...plan.match.rowIndexes, ...previousRows], previousMatch.source);
                    return;
                }
                next[fileKey] = plan.match;
            });
            return next;
        });
    }, [fileMatchPlans]);
    useEffect(() => {
        Object.entries(fileMatchPlans).forEach(([fileKey, plan]) => {
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
        return Object.fromEntries(currentFileKeys.map((fileKey) => {
            const plan = fileMatchPlans[fileKey];
            if (!plan ||
                plan.resolution.totalCandidates === 0) {
                return [fileKey, false];
            }
            let accounted = plan.resolution.locallyMatched +
                plan.resolution.locallyNotEnrolled;
            plan.manualTasks.forEach((task) => {
                const resolution = manualTaskResolutions[`${fileKey}::${task.taskKey}`];
                if (resolution)
                    accounted += 1;
            });
            plan.pendingAi?.tasks.forEach((task) => {
                const requestKey = `${fileKey}::${task.taskKey}`;
                const resolution = manualTaskResolutions[requestKey];
                if (resolution) {
                    accounted += 1;
                    return;
                }
                const payloadKey = JSON.stringify({
                    detectedNames: task.detectedNames,
                    candidates: task.candidates,
                });
                const outcome = aiTaskOutcomes[requestKey];
                if (outcome?.payloadKey === payloadKey &&
                    outcome.status === "matched") {
                    accounted += 1;
                }
            });
            return [
                fileKey,
                !aiMatchingFileKeys.includes(fileKey) &&
                    accounted >=
                        plan.resolution.totalCandidates,
            ];
        })) as Record<string, boolean>;
    }, [
        currentFileKeys,
        fileMatchPlans,
        manualTaskResolutions,
        aiTaskOutcomes,
        aiMatchingFileKeys,
    ]);
    const currentKkFileKeys = useMemo(() => currentFileKeys.filter((fileKey) => Boolean(fileExtractions[fileKey]?.kk)), [currentFileKeys, fileExtractions]);
    const currentAktaFileKeys = useMemo(() => currentFileKeys.filter((fileKey) => Boolean(fileExtractions[fileKey]?.akta)), [currentFileKeys, fileExtractions]);
    const sessionStudentRowIndexes = useMemo(() => {
        return [
            ...new Set(currentFileKeys.flatMap((fileKey) => fileStudentMatches[fileKey]?.rowIndexes ?? [])),
        ];
    }, [currentFileKeys, fileStudentMatches]);
    useEffect(() => {
        if (detectedFileKeys.length === 0) {
            setDetectedStudentRowIndexes([]);
            return;
        }
        const rows = [
            ...new Set(detectedFileKeys.flatMap((fileKey) => fileStudentMatches[fileKey]?.rowIndexes ?? [])),
        ];
        setDetectedStudentRowIndexes((previous) => {
            if (previous.length === rows.length &&
                previous.every((rowIndex, index) => rowIndex === rows[index])) {
                return previous;
            }
            return rows;
        });
    }, [detectedFileKeys, fileStudentMatches]);
    const kkStudentRowIndexes = useMemo(() => {
        return [
            ...new Set(currentKkFileKeys.flatMap((fileKey) => fileStudentMatches[fileKey]?.rowIndexes ?? [])),
        ];
    }, [currentKkFileKeys, fileStudentMatches]);
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
                ...new Set(currentAktaFileKeys.flatMap((fileKey) => (fileStudentMatches[fileKey]?.rowIndexes ?? []).filter((rowIndex) => !kkRows.has(rowIndex)))),
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
        fileStudentMatches,
        students,
    ]);
    const primarySessionStudent = useMemo(() => {
        if (sessionConflict || sessionStudents.length === 0)
            return null;
        if (selectedStudentRow !== null) {
            const selected = sessionStudents.find((student) => student.rowIndex === selectedStudentRow);
            if (selected)
                return selected;
        }
        return sessionStudents[0] ?? null;
    }, [
        sessionConflict,
        sessionStudents,
        selectedStudentRow,
    ]);
    const missingExtractionFileKeys = useMemo(() => currentFileKeys.filter((fileKey) => !fileExtractions[fileKey]), [currentFileKeys, fileExtractions]);
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
            const kkCount = currentKkFileKeys.filter((fileKey) => fileStudentMatches[fileKey]?.rowIndexes.includes(student.rowIndex)).length;
            const aktaCount = currentAktaFileKeys.filter((fileKey) => fileStudentMatches[fileKey]?.rowIndexes.includes(student.rowIndex)).length;
            if (kkCount <= 1 && aktaCount <= 1)
                continue;
            const types: string[] = [];
            if (kkCount > 1)
                types.push("KK");
            if (aktaCount > 1)
                types.push("Akta Kelahiran");
            duplicates.push(`${student.nama} (${types.join(" dan ")})`);
        }
        if (duplicates.length === 0)
            return "";
        return `Terdapat dokumen duplikat untuk ${duplicates.join(", ")}. Hapus dokumen duplikat sebelum menyimpan data.`;
    }, [
        sessionStudents,
        currentKkFileKeys,
        currentAktaFileKeys,
        fileStudentMatches,
    ]);
    const unresolvedResolutionFileKeys = useMemo(() => currentFileKeys.filter((fileKey) => !fileResolutionComplete[fileKey]), [currentFileKeys, fileResolutionComplete]);
    const sessionReady = files.length > 0 &&
        !isExtracting &&
        !isAiMatching &&
        !sessionConflict &&
        !duplicateDocumentMsg &&
        missingExtractionFileKeys.length === 0 &&
        unresolvedFileKeys.length === 0 &&
        unresolvedResolutionFileKeys.length === 0 &&
        sessionStudents.length > 0;
    const primaryStudentFileKeys = useMemo(() => {
        if (!primarySessionStudent || sessionConflict)
            return [];
        return currentFileKeys.filter((fileKey) => fileStudentMatches[fileKey]?.rowIndexes.includes(primarySessionStudent.rowIndex));
    }, [
        currentFileKeys,
        fileStudentMatches,
        primarySessionStudent,
        sessionConflict,
    ]);
    const primaryStudentExtractions = useMemo(() => {
        return primaryStudentFileKeys
            .map((fileKey) => fileExtractions[fileKey])
            .filter(Boolean);
    }, [primaryStudentFileKeys, fileExtractions]);
    const sessionKkExtraction = useMemo(() => primaryStudentExtractions.find((item) => item.kk) ?? null, [primaryStudentExtractions]);
    const sessionAktaExtraction = useMemo(() => primaryStudentExtractions.find((item) => item.akta) ?? null, [primaryStudentExtractions]);
    const activeKk = useMemo(() => files.length > 0
        ? sessionKkExtraction?.kk ?? null
        : resultKk, [files.length, sessionKkExtraction, resultKk]);
    const activeAkta = useMemo(() => files.length > 0
        ? sessionAktaExtraction?.akta ?? null
        : resultAkta, [files.length, sessionAktaExtraction, resultAkta]);
    const activeModelUsedKk = useMemo(() => files.length > 0
        ? sessionKkExtraction?.modelUsedKk ?? ""
        : modelUsedKk, [files.length, sessionKkExtraction, modelUsedKk]);
    const activeModelUsedAkta = useMemo(() => files.length > 0
        ? sessionAktaExtraction?.modelUsedAkta ?? ""
        : modelUsedAkta, [files.length, sessionAktaExtraction, modelUsedAkta]);
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
            const documentType = documentTypes[fileKey] || null;
            const fileMatch = fileStudentMatches[fileKey];
            const rowIndexes = fileMatch?.rowIndexes ?? [];
            if (!documentType || rowIndexes.length === 0) {
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
                const displayName = createCanonicalFileName(student.nama, documentType);
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
        fileStudentMatches,
        students,
    ]);
    const pendingFiles = useMemo(() => {
        const processed = new Set(processedFileKeys);
        return files.filter((file) => !processed.has(getDocumentFileKey(file)));
    }, [
        files,
        processedFileKeys,
    ]);
    const hasPendingFiles = pendingFiles.length > 0;
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
            const studentFileKeys = currentFileKeys.filter((fileKey) => fileStudentMatches[fileKey]?.rowIndexes.includes(student.rowIndex));
            const studentExtractions = studentFileKeys
                .map((fileKey) => fileExtractions[fileKey])
                .filter(Boolean);
            const kkExtraction = studentExtractions.find((item) => item.kk) ?? null;
            const aktaExtraction = studentExtractions.find((item) => item.akta) ?? null;
            const kk = kkExtraction?.kk ?? null;
            const akta = aktaExtraction?.akta ?? null;
            if (!kk && !akta)
                continue;
            const id = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);
            const existingHistory = historyRef.current.find((item) => item.id === id);
            addOrUpdateHistory({
                id,
                studentName: student.nama,
                kk,
                akta,
                modelUsedKk: kk
                    ? kkExtraction?.modelUsedKk ?? ""
                    : "",
                modelUsedAkta: akta
                    ? aktaExtraction?.modelUsedAkta ?? ""
                    : "",
                updatedAt: new Date().toISOString(),
                savedToSheetAt: existingHistory?.savedToSheetAt,
            });
        }
    }, [
        sessionReady,
        sessionStudents,
        currentFileKeys,
        fileStudentMatches,
        fileExtractions,
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
        if (files.length === 0 ||
            isExtracting ||
            pendingFiles.length === 0) {
            return;
        }
        void extract(pendingFiles);
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
    const handleUploadFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        if (selectedFiles.length === 0)
            return;
        studentRequestIdRef.current += 1;
        setSelectedHistoryId("");
        setLoadingStudentDetail(false);
        const selectedKeys = selectedFiles.map(getDocumentFileKey);
        const startNewSession = () => {
            invalidateAllAiTasks();
            clearResolutionState();
            reset();
            setSelectedStudentRow(null);
            setFileStudentMatches({});
            setDetectedStudentRowIndexes([]);
            setDetectedFileKeys(selectedKeys);
            replaceFiles(selectedFiles);
            event.target.value = "";
        };
        if (files.length === 0) {
            startNewSession();
            return;
        }
        // Fast path: nama file lama dan baru sudah menunjuk siswa yang sama.
        const incomingNames = new Set(selectedFiles.map(getUploadStudentKey).filter(Boolean));
        const keptFiles = files.filter((oldFile) => {
            const oldFileKey = getDocumentFileKey(oldFile);
            const oldName = getUploadStudentKey(oldFile);
            if (incomingNames.has(oldName))
                return true;
            // Fallback hanya untuk nama file generik/shared KK: cek row hasil matching file lama.
            const matchedRows = fileStudentMatches[oldFileKey]?.rowIndexes ?? [];
            return matchedRows.length > 0 && selectedFiles.some((newFile) => uploadMatchesStudentRows(newFile, matchedRows, students));
        });
        console.log("[Upload Session]", {
            incoming: selectedFiles.map((file) => ({ name: file.name, key: getUploadStudentKey(file) })),
            existing: files.map((file) => ({
                name: file.name,
                key: getUploadStudentKey(file),
                rows: fileStudentMatches[getDocumentFileKey(file)]?.rowIndexes ?? [],
            })),
            kept: keptFiles.map((file) => file.name),
        });
        if (keptFiles.length === 0) {
            startNewSession();
            return;
        }
        const keptKeys = new Set(keptFiles.map(getDocumentFileKey));
        const removedFiles = files.filter((file) => !keptKeys.has(getDocumentFileKey(file)));
        removedFiles.forEach((file) => {
            const fileKey = getDocumentFileKey(file);
            invalidateAiTasksForFile(fileKey);
            removeFileExtraction(file);
        });
        setFileStudentMatches((previous) => {
            const next = { ...previous };
            removedFiles.forEach((file) => delete next[getDocumentFileKey(file)]);
            return next;
        });
        const retainedRows = [...new Set(keptFiles.flatMap((file) => fileStudentMatches[getDocumentFileKey(file)]?.rowIndexes ?? []))];
        if (selectedStudentRow !== null && !retainedRows.includes(selectedStudentRow))
            setSelectedStudentRow(null);
        const nextFiles = [...keptFiles, ...selectedFiles];
        setDetectedStudentRowIndexes(retainedRows);
        setDetectedFileKeys(nextFiles.map(getDocumentFileKey));
        replaceFiles(nextFiles);
        event.target.value = "";
    };
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
    const handleRemoveUploadFile = (fileKey: string) => {
        const index = files.findIndex((file) => getDocumentFileKey(file) === fileKey);
        if (index === -1)
            return;
        const file = files[index];
        invalidateAiTasksForFile(fileKey);
        removeFileExtraction(file);
        handleRemoveFile(index);
        setDetectedFileKeys((previous) => previous.filter((key) => key !== fileKey));
        setFileStudentMatches((previous) => {
            const next = { ...previous };
            delete next[fileKey];
            return next;
        });
        if (files.length === 1) {
            setDetectedFileKeys([]);
            setDetectedStudentRowIndexes([]);
            setSelectedHistoryId("");
            setSelectedStudentRow(null);
            setFileStudentMatches({});
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
    };
    const handleSelectStudent = async (student: StudentRecord) => {
        if (isExtracting)
            return;
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
        const normalizedStudentName = extractStudentNameFromFilename(`${student.nama}_KK.pdf`);
        setSelectedHistoryId(normalizedStudentName);
        const localItem = historyMap.get(normalizedStudentName);
        if (localItem) {
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
            if (requestId !==
                studentRequestIdRef.current) {
                return;
            }
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
        const studentFileKeys = currentFileKeys.filter((fileKey) => fileStudentMatches[fileKey]?.rowIndexes.includes(student.rowIndex));
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
        const sourceStudents = files.length > 0
            ? targetStudents.filter((student) => sessionStudentRowIndexes.includes(student.rowIndex))
            : targetStudents;
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
    return (<DashboardLayout>
      <DashboardContent>
        <section className="col-span-12 h-full lg:col-span-6">
          <UploadSection files={files} displayFiles={displayFiles} fileStudentMatches={fileStudentMatches} manualTasks={manualTasksByFile} manualTaskResolutions={manualTaskResolutions} students={students} processedFileKeys={processedFileKeys} aiMatchingFileKeys={aiMatchingFileKeys} isExtracting={isExtracting} errorMsg={errorMsg} conflictMsg={sessionConflict} duplicateMsg={duplicateDocumentMsg} sessionReady={sessionReady} hasPendingFiles={hasPendingFiles} onFileChange={handleUploadFileChange} onRemoveFile={handleRemoveUploadFile} onResetSession={handleResetUploadSession} onResolveStudent={handleResolveFileStudent} onIgnoreStudent={handleIgnoreFileStudent}/>
        </section>

        <StudentPanel students={students} history={history} loading={loadingStudents} error={studentError} activeRowIndex={selectedStudentRow} priorityRowIndexes={detectedStudentRowIndexes} savingStudentId={savingStudentId} saveFeedback={saveFeedback} onSelect={handleSelectStudent} onRefresh={refreshStudents} onSave={handleSaveStudent} onSaveAll={handleSaveAllStudents} savingAll={savingAll}/>

        <AktaPanel data={activeAkta} modelUsed={activeModelUsedAkta}/>

        <KkSummary data={activeKk} modelUsed={activeModelUsedKk}/>

        <KkMembers data={activeKk} studentName={activeStudentName}/>

        {(loadingStudentDetail || isAiMatching) && (<div className="pointer-events-none fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600"/>

            {isAiMatching
                ? "Mencocokkan nama murid..."
                : "Memuat detail murid..."}
          </div>)}
      </DashboardContent>
    </DashboardLayout>);
}
