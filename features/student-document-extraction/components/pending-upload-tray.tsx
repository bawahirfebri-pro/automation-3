import { useMemo, useState } from "react";

import type { FileStudentMatch } from "@/lib/students/file-student-matcher";

import type { DocumentDisplayFile } from "@/types/document-file";
import type { ManualResolutionTask, ManualResolutionValue } from "@/types/manual-resolution";
import type { StudentRecord } from "@/types/student";

interface PendingUploadTrayProps {
  displayFiles: DocumentDisplayFile[];
  processedFileKeys: string[];
  failedFileKeys: string[];
  aiMatchingFileKeys: string[];
  filenameMatchIssues: Record<string, { status: "not-found"; detectedName: string }>;
  fileStudentMatches: Record<string, FileStudentMatch>;
  manualTasks: Record<string, ManualResolutionTask[]>;
  manualTaskResolutions: Record<string, ManualResolutionValue>;
  students: StudentRecord[];
  onResetSession: () => void;
  onResolveStudent: (fileKey: string, taskKey: string, rowIndex: number) => void;
  onIgnoreStudent: (fileKey: string, taskKey: string) => void;
}

interface PendingTrayItem {
  key: string;
  studentName: string;
  fileName: string;
  studentRowIndex: number | null;
  fileKeys: string[];
  documentLabels: string[];
}

function getDocumentLabels(displayFile: DocumentDisplayFile): string[] {
  if (displayFile.documentType === "both") return ["KK", "Akta"];
  if (displayFile.documentType === "kk") return ["KK"];
  if (displayFile.documentType === "akta") return ["Akta"];
  return [];
}

export default function PendingUploadTray({
  displayFiles,
  processedFileKeys,
  failedFileKeys,
  aiMatchingFileKeys,
  filenameMatchIssues,
  fileStudentMatches,
  manualTasks,
  manualTaskResolutions,
  students,
  onResetSession,
  onResolveStudent,
  onIgnoreStudent,
}: PendingUploadTrayProps) {
  const [resolvingTaskKey, setResolvingTaskKey] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const processedSet = useMemo(() => new Set(processedFileKeys), [processedFileKeys]);
  const failedSet = useMemo(() => new Set(failedFileKeys), [failedFileKeys]);
  const aiMatchingSet = useMemo(() => new Set(aiMatchingFileKeys), [aiMatchingFileKeys]);

  const unresolvedTasksByFile = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(manualTasks).map(([fileKey, tasks]) => [
          fileKey,
          tasks.filter((task) => !manualTaskResolutions[`${fileKey}::${task.taskKey}`]),
        ]),
      ) as Record<string, ManualResolutionTask[]>,
    [manualTasks, manualTaskResolutions],
  );

  const items = useMemo(() => {
    const grouped = new Map<string, PendingTrayItem>();

    displayFiles.forEach((displayFile) => {
      const matched = displayFile.studentRowIndex !== null;
      const key = matched
        ? `student:${displayFile.studentRowIndex}`
        : `file:${displayFile.fileKey}`;

      const existing = grouped.get(key);

      if (existing) {
        if (!existing.fileKeys.includes(displayFile.fileKey)) {
          existing.fileKeys.push(displayFile.fileKey);
        }

        getDocumentLabels(displayFile).forEach((label) => {
          if (!existing.documentLabels.includes(label)) {
            existing.documentLabels.push(label);
          }
        });

        return;
      }

      grouped.set(key, {
        key,
        studentName: matched ? displayFile.studentName : "",
        fileName: displayFile.displayName || displayFile.originalName,
        studentRowIndex: displayFile.studentRowIndex,
        fileKeys: [displayFile.fileKey],
        documentLabels: getDocumentLabels(displayFile),
      });
    });

    return [...grouped.values()];
  }, [displayFiles]);

  const getTaskOptions = (task: ManualResolutionTask): StudentRecord[] => {
    const search = studentSearch.trim().toLowerCase();

    if (search) {
      return students.filter((student) => student.nama.toLowerCase().includes(search)).slice(0, 8);
    }

    return task.candidates
      .map((candidate) => students.find((student) => student.rowIndex === candidate.rowIndex))
      .filter((student): student is StudentRecord => Boolean(student))
      .slice(0, 8);
  };

  const closeStudentPicker = () => {
    setResolvingTaskKey("");
    setStudentSearch("");
  };

  if (items.length === 0) return null;

  return (
    <section className="flex max-h-[50%] shrink-0 flex-col border-t border-gray-200/70 bg-[#FBFBFB]">
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[11px] font-medium text-gray-700">Upload aktif</h3>
          <span className="text-[10px] text-gray-400">{items.length}</span>
        </div>

        <button
          type="button"
          onClick={onResetSession}
          className="text-[9px] text-gray-400 transition-colors hover:text-gray-700"
        >
          Bersihkan
        </button>
      </div>

      <div className="min-h-0 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const hasFailed = item.fileKeys.some((fileKey) => failedSet.has(fileKey));
            const isAiMatching = item.fileKeys.some((fileKey) => aiMatchingSet.has(fileKey));
            const isProcessing = item.fileKeys.some((fileKey) => !processedSet.has(fileKey));
            const filenameIssue = item.fileKeys
              .map((fileKey) => filenameMatchIssues[fileKey])
              .find(Boolean);

            const unresolvedTasks = item.fileKeys.flatMap((fileKey) =>
              (unresolvedTasksByFile[fileKey] ?? []).map((task) => ({ fileKey, task })),
            );

            const status = hasFailed
              ? "failed"
              : isAiMatching
                ? "matching"
                : isProcessing
                  ? "processing"
                  : unresolvedTasks.length > 0 || item.studentRowIndex === null
                    ? "unresolved"
                    : "ready";

            return (
              <li key={item.key}>
                <div className="rounded-md px-2.5 py-2">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-gray-700">
                        {item.studentRowIndex !== null ? item.studentName : item.fileName}
                      </p>

                      <p
                        className={`mt-0.5 truncate text-[9px] ${
                          status === "failed"
                            ? "text-red-500"
                            : status === "ready"
                              ? "text-emerald-600"
                              : status === "unresolved"
                                ? "text-amber-600"
                                : "text-gray-400"
                        }`}
                      >
                        {status === "failed"
                          ? "Gagal diproses"
                          : status === "matching"
                            ? "Mencocokkan murid..."
                            : status === "processing"
                              ? "Memproses dokumen..."
                              : status === "ready"
                                ? "Siap disimpan"
                                : filenameIssue
                                  ? `${filenameIssue.detectedName} belum ditemukan`
                                  : "Perlu memilih murid"}
                      </p>
                    </div>

                    {item.documentLabels.length > 0 && (
                      <div className="flex shrink-0 items-center gap-1">
                        {item.documentLabels.map((label) => (
                          <span
                            key={label}
                            className="flex h-5 items-center justify-center rounded-md bg-gray-100 px-1.5 text-[9px] font-medium text-gray-500"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {unresolvedTasks.map(({ fileKey, task }) => {
                    const pickerKey = `${fileKey}::${task.taskKey}`;
                    const isOpen = resolvingTaskKey === pickerKey;
                    const options = getTaskOptions(task);
                    const claimedRows = fileStudentMatches[fileKey]?.rowIndexes ?? [];

                    return (
                      <div
                        key={pickerKey}
                        className="mt-2 rounded-md border border-amber-100 bg-amber-50/70 p-2"
                      >
                        <p className="truncate text-[10px] font-medium text-amber-800">
                          {task.detectedName}
                        </p>

                        <p className="mt-0.5 text-[9px] leading-4 text-amber-700">
                          {task.reason === "duplicate-name"
                            ? "Nama ditemukan pada lebih dari satu murid."
                            : "Belum cukup yakin menentukan murid yang sesuai."}
                        </p>

                        {!isOpen ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingTaskKey(pickerKey);
                                setStudentSearch("");
                              }}
                              className="inline-flex h-6 items-center rounded-md bg-amber-100 px-2 text-[9px] font-medium text-amber-800 transition-colors hover:bg-amber-200"
                            >
                              Pilih murid
                            </button>

                            <button
                              type="button"
                              onClick={() => onIgnoreStudent(fileKey, task.taskKey)}
                              className="inline-flex h-6 items-center rounded-md bg-white px-2 text-[9px] font-medium text-gray-500 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-gray-700"
                            >
                              Bukan murid sekolah ini
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 overflow-hidden rounded-md border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 p-1.5">
                              <input
                                autoFocus
                                type="text"
                                value={studentSearch}
                                onChange={(event) => setStudentSearch(event.target.value)}
                                placeholder="Cari nama murid..."
                                className="h-7 w-full rounded-md bg-gray-50 px-2 text-[10px] text-gray-700 outline-none placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-gray-200"
                              />
                            </div>

                            <div className="max-h-[140px] overflow-y-auto p-1">
                              {options.map((student) => {
                                const alreadyClaimed = claimedRows.includes(student.rowIndex);

                                return (
                                  <button
                                    key={student.rowIndex}
                                    type="button"
                                    disabled={alreadyClaimed}
                                    onClick={() => {
                                      onResolveStudent(fileKey, task.taskKey, student.rowIndex);
                                      closeStudentPicker();
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[10px] text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                                  >
                                    <span className="truncate">{student.nama}</span>

                                    {alreadyClaimed && (
                                      <span className="shrink-0 text-[9px] text-gray-300">
                                        Sudah dipakai
                                      </span>
                                    )}
                                  </button>
                                );
                              })}

                              {options.length === 0 && (
                                <div className="px-2 py-3 text-center text-[10px] text-gray-400">
                                  Murid tidak ditemukan
                                </div>
                              )}
                            </div>

                            <div className="border-t border-gray-100 p-1">
                              <button
                                type="button"
                                onClick={closeStudentPicker}
                                className="w-full rounded-md py-1 text-[9px] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
