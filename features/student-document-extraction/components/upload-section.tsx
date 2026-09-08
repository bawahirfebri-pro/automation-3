import {
  useMemo,
  useRef,
  useState,
} from "react";

import type { DocumentDisplayFile } from "@/types/document-file";
import type { StudentRecord } from "@/types/student";
import type { FileStudentMatch } from "@/lib/students/file-student-matcher";
import type {
  ManualResolutionTask,
  ManualResolutionValue,
} from "@/types/manual-resolution";

interface UploadSectionProps {
  files: File[];
  displayFiles: DocumentDisplayFile[];

  fileStudentMatches: Record<
    string,
    FileStudentMatch
  >;

  manualTasks: Record<
    string,
    ManualResolutionTask[]
  >;

  manualTaskResolutions: Record<
    string,
    ManualResolutionValue
  >;

  students: StudentRecord[];

  processedFileKeys: string[];
  failedFileKeys: string[];
  aiMatchingFileKeys: string[];

  isExtracting: boolean;
  isPreprocessing: boolean;

  errorMsg: string;
  conflictMsg: string;
  duplicateMsg: string;

  sessionReady: boolean;
  hasPendingFiles: boolean;

  filenameMatchIssues: Record<
    string,
    {
      status: "not-found";
      detectedName: string;
    }
  >;

  onFileChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;

  onRemoveFile: (
    fileKey: string,
    studentRowIndex: number | null
  ) => void;

  onResetSession: () => void;

  onResolveStudent: (
    fileKey: string,
    taskKey: string,
    rowIndex: number
  ) => void;

  onIgnoreStudent: (
    fileKey: string,
    taskKey: string
  ) => void;
}

interface FileStatus {
  label: string;
  className: string;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: {
    description?: string;
    accept: Record<
      string,
      string[]
    >;
  }[];
}

interface WritableFileHandle {
  createWritable: () => Promise<{
    write: (
      data: Blob
    ) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

interface DirectoryFileHandle {
  createWritable: () => Promise<{
    write: (
      data: Blob
    ) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

interface DirectoryHandle {
  getFileHandle: (
    name: string,
    options: {
      create: boolean;
    }
  ) => Promise<DirectoryFileHandle>;
}

type FilePickerWindow =
  typeof window & {
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions
    ) => Promise<WritableFileHandle>;

    showDirectoryPicker?: () =>
      Promise<DirectoryHandle>;
  };

export default function UploadSection({
  files,
  displayFiles,
  fileStudentMatches,
  filenameMatchIssues,
  manualTasks,
  manualTaskResolutions,
  students,
  processedFileKeys,
  failedFileKeys,
  aiMatchingFileKeys,
  isExtracting,
  isPreprocessing,
  errorMsg,
  conflictMsg,
  duplicateMsg,
  sessionReady,
  hasPendingFiles,
  onFileChange,
  onRemoveFile,
  onResetSession,
  onResolveStudent,
  onIgnoreStudent,
}: UploadSectionProps) {
  const [resolvingTaskKey, setResolvingTaskKey] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [showUploadPicker, setShowUploadPicker] = useState(false);
  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );
  const compactQueueMode = displayFiles.length > 2;
const uploadPickerVisible = !compactQueueMode || showUploadPicker;
const queueVisible = files.length > 0 && (!compactQueueMode || !showUploadPicker);

  

  const handlePickerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(event);
    if (compactQueueMode) setShowUploadPicker(false);
  };

  const processedFiles = new Set(processedFileKeys);
  const failedFiles = new Set(failedFileKeys);
  const aiMatchingFiles = new Set(aiMatchingFileKeys);
  const hasBlockingIssue = Boolean(conflictMsg || duplicateMsg);

  const isBusy =
    isPreprocessing ||
    isExtracting;

  const sortedDisplayFiles =
    useMemo(() => {
      return [...displayFiles]
        .map((item, originalIndex) => ({
          item,
          originalIndex,
        }))
        .sort((a, b) => {
          const aRenamed =
            a.item.renamed;

          const bRenamed =
            b.item.renamed;

          /*
           * File yang sudah berhasil
           * disesuaikan namanya berada
           * di atas.
           */
          if (
            aRenamed !==
            bRenamed
          ) {
            return aRenamed
              ? -1
              : 1;
          }

          /*
           * File yang sudah rename
           * diurutkan A-Z.
           */
          if (
            aRenamed &&
            bRenamed
          ) {
            const nameA =
              (
                a.item.studentName ||
                a.item.displayName ||
                ""
              ).trim();

            const nameB =
              (
                b.item.studentName ||
                b.item.displayName ||
                ""
              ).trim();

            return nameA.localeCompare(
              nameB,
              "id",
              {
                sensitivity:
                  "base",
                numeric: true,
              }
            );
          }

          /*
           * File yang belum rename
           * tetap mempertahankan
           * urutan asal.
           */
          return (
            a.originalIndex -
            b.originalIndex
          );
        })
        .map(
          ({ item }) =>
            item
        );
    }, [displayFiles]);

  const renamedFiles =
    sortedDisplayFiles.filter(
      (item) =>
        item.renamed
    );

  const canonicalStudents = [
    ...new Set(
      renamedFiles
        .map(
          (item) =>
            item.studentName?.trim()
        )
        .filter(
          (
            name
          ): name is string =>
            Boolean(name)
        )
    ),
  ];

  const canonicalPreview =
    canonicalStudents.length === 1
      ? canonicalStudents[0]
      : canonicalStudents.length > 1
        ? `${canonicalStudents.length} murid`
        : "";

  const firstOutputKeyByFile =
    useMemo(() => {
      const result =
        new Map<
          string,
          string
        >();

      for (
        const item
        of sortedDisplayFiles
      ) {
        if (
          !result.has(
            item.fileKey
          )
        ) {
          result.set(
            item.fileKey,
            item.outputKey
          );
        }
      }

      return result;
    }, [
      sortedDisplayFiles,
    ]);

  const unresolvedTasksByFile = useMemo(() => {
    return Object.fromEntries(
      Object.entries(manualTasks).map(([fileKey, tasks]) => [
        fileKey,
        tasks.filter(
          (task) =>
            !manualTaskResolutions[
            `${fileKey}::${task.taskKey}`
            ]
        ),
      ])
    ) as Record<string, ManualResolutionTask[]>;
  }, [manualTasks, manualTaskResolutions]);

  const getFileStatus = (
    displayFile: DocumentDisplayFile
  ): FileStatus => {
    const fileKey = displayFile.fileKey;
    const fileMatch = fileStudentMatches[fileKey];
    const isProcessed = processedFiles.has(fileKey);
    const isAiMatching = aiMatchingFiles.has(fileKey);
    const isFailed = failedFiles.has(fileKey);
    const unresolvedTasks =
      unresolvedTasksByFile[fileKey]?.length ?? 0;

    if (isFailed) {
      return {
        label: "Gagal",
        className: "bg-red-50 text-red-600",
      };
    }

    if (
      conflictMsg &&
      (fileMatch?.rowIndexes.length ?? 0) > 0
    ) {
      return {
        label: "Konflik",
        className: "bg-red-50 text-red-600",
      };
    }

    if (isAiMatching) {
      return {
        label: "Mencocokkan",
        className: "bg-violet-50 text-violet-700",
      };
    }

    if (
      !isProcessed &&
      (isExtracting || hasPendingFiles)
    ) {
      return {
        label: "Memproses",
        className: "bg-blue-50 text-blue-600",
      };
    }

    const filenameIssue =
      filenameMatchIssues[fileKey];

    if (
      filenameIssue?.status === "not-found"
    ) {
      return {
        label: "Tidak terdaftar",
        className: "bg-red-50 text-red-600",
      };
    }

    if (unresolvedTasks > 0) {
      return {
        label: "Perlu dipilih",
        className: "bg-amber-50 text-amber-700",
      };
    }

    const isSupportedDocument =
      displayFile.documentType === "kk" ||
      displayFile.documentType === "akta" ||
      displayFile.documentType === "both";

    if (
      (fileMatch?.rowIndexes.length ?? 0) > 0 &&
      isSupportedDocument &&
      isProcessed
    ) {
      return {
        label: "Berhasil",
        className:
          "bg-emerald-50 text-emerald-700",
      };
    }

    if (
      isProcessed &&
      !isSupportedDocument
    ) {
      return {
        label: "Bukan KK/Akta",
        className:
          "bg-gray-100 text-gray-500",
      };
    }

    if (isProcessed) {
      return {
        label: "Mengidentifikasi",
        className:
          "bg-gray-100 text-gray-600",
      };
    }

    return {
      label: "Siap",
      className: "bg-gray-100 text-gray-500",
    };
  };

  const getMatchMethod = (displayFile: DocumentDisplayFile) => {
    const match = fileStudentMatches[displayFile.fileKey];

    if (!match || match.rowIndexes.length === 0) return "";
    if (match.source === "exact") return "Cocok otomatis";
    if (match.source === "fuzzy") return "Cocok berdasarkan kemiripan";
    if (match.source === "ai") return "Cocok dengan bantuan AI";
    if (match.source === "manual") return "Sebagian dipilih manual";

    return "";
  };

  const getTaskOptions = (
    task: ManualResolutionTask
  ): StudentRecord[] => {
    const search = studentSearch.trim().toLowerCase();

    if (search) {
      return students
        .filter((student) =>
          student.nama.toLowerCase().includes(search)
        )
        .slice(0, 8);
    }

    return task.candidates
      .map((candidate) =>
        students.find(
          (student) => student.rowIndex === candidate.rowIndex
        )
      )
      .filter((student): student is StudentRecord => Boolean(student))
      .slice(0, 8);
  };

  const downloadFileFallback = (
    displayFile: DocumentDisplayFile
  ) => {
    const url =
      URL.createObjectURL(
        displayFile.file
      );

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      displayFile.displayName;

    document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();

    window.setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      1000
    );
  };

  const handleSaveRenamedFile =
    async (
      displayFile:
        DocumentDisplayFile
    ) => {
      if (
        !displayFile.renamed ||
        hasBlockingIssue
      ) {
        return;
      }

      const pickerWindow =
        window as FilePickerWindow;

      /*
       * Browser yang belum mendukung
       * File System Access API
       * tetap menggunakan download biasa.
       */
      if (
        !pickerWindow.showSaveFilePicker
      ) {
        downloadFileFallback(
          displayFile
        );

        return;
      }

      try {
        const handle =
          await pickerWindow
            .showSaveFilePicker({
              suggestedName:
                displayFile
                  .displayName,

              types: [
                {
                  description:
                    "Dokumen PDF",

                  accept: {
                    "application/pdf":
                      [".pdf"],
                  },
                },
              ],
            });

        const writable =
          await handle
            .createWritable();

        await writable.write(
          displayFile.file
        );

        await writable.close();
      } catch (error) {
        /*
         * User menekan Cancel pada
         * dialog Save As.
         */
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[SAVE PDF]",
          error
        );
      }
    };

  const handleSaveAllRenamedFiles =
    async () => {
      if (
        hasBlockingIssue ||
        renamedFiles.length === 0
      ) {
        return;
      }

      const pickerWindow =
        window as FilePickerWindow;

      /*
       * Kalau browser belum
       * mendukung pemilihan folder,
       * gunakan download lama.
       */
      if (
        !pickerWindow.showDirectoryPicker
      ) {
        renamedFiles.forEach(
          (
            displayFile,
            index
          ) => {
            window.setTimeout(
              () =>
                downloadFileFallback(
                  displayFile
                ),
              index * 150
            );
          }
        );

        return;
      }

      try {
        const directoryHandle =
          await pickerWindow
            .showDirectoryPicker();

        for (
          const displayFile
          of renamedFiles
        ) {
          const fileHandle =
            await directoryHandle
              .getFileHandle(
                displayFile
                  .displayName,
                {
                  create: true,
                }
              );

          const writable =
            await fileHandle
              .createWritable();

          await writable.write(
            displayFile.file
          );

          await writable.close();
        }
      } catch (error) {
        /*
         * User menekan Cancel pada
         * dialog pemilihan folder.
         */
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "[SAVE ALL PDF]",
          error
        );
      }
    };

  const closeStudentPicker = () => {
    setResolvingTaskKey("");
    setStudentSearch("");
  };

  return (
    <div className="flex h-[516px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handlePickerChange}
        disabled={isBusy}
        className="hidden"
      />
      <div className="flex min-h-[73px] items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V4m0 0L8 8m4-4 4 4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 14v4.25A1.75 1.75 0 0 0 6.75 20h10.5A1.75 1.75 0 0 0 19 18.25V14"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">
              Tambahkan Dokumen
            </h2>
            <p className="text-xs text-gray-500">
              Upload KK dan Akta Kelahiran dalam format PDF
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-5">
        {uploadPickerVisible && (
          <>
            {compactQueueMode && (
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Tambah dokumen</p>
                  <p className="mt-0.5 text-[10px] text-gray-400">Pilih PDF baru untuk dimasukkan ke antrean.</p>
                </div>
                <button type="button" onClick={() => setShowUploadPicker(false)} disabled={isBusy} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-[10px] font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m12 5-5 5 5 5" /></svg>
                  Kembali ke antrean
                </button>
              </div>
            )}

            <label
              onClick={() => {
                if (!isBusy) {
                  fileInputRef.current?.click();
                }
              }}
              className={`group flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${isBusy
                ? "cursor-not-allowed border-gray-200 bg-gray-50"
                : "cursor-pointer border-gray-300 bg-gray-50/70 hover:border-blue-400 hover:bg-blue-50/40"
                }`}
            >
              {isBusy ? (
                <>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {isPreprocessing
                      ? "Sedang menyiapkan dokumen"
                      : "Sedang memproses dokumen"}
                  </span>

                  <span className="mt-1 max-w-[280px] text-xs leading-5 text-gray-400">
                    {isPreprocessing
                      ? "Dokumen sedang dipisahkan dan diperiksa sebelum proses ekstraksi."
                      : "AI sedang membaca dan mengekstrak data dari dokumen. Mohon tunggu beberapa saat."}
                  </span>
                </>
              ) : (
                <>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-100 transition-colors group-hover:text-blue-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h6.5L18.25 8.5V20A1.25 1.25 0 0 1 17 21.25H7A1.25 1.25 0 0 1 5.75 20V5A1.25 1.25 0 0 1 7 3.75Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75V8.5h4.75" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6M12 11v6" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Pilih dokumen PDF</span>
                  <span className="mt-1 text-xs text-gray-400">File akan langsung diekstrak setelah dipilih</span>
                </>
              )}
            </label>
          </>
        )}

        {queueVisible && (
          <div className={`${compactQueueMode ? "flex min-h-0 flex-1 flex-col" : "mt-5 shrink-0"} overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50`}>
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-700">
                    Antrean Dokumen
                  </p>

                  {sessionReady && (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700">
                      Siap disimpan
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-[11px] text-gray-400">
                  {files.length} file sumber
                  {displayFiles.length !== files.length
                    ? ` · ${displayFiles.length} output`
                    : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {compactQueueMode && (
                  <button type="button" onClick={() => {
                    fileInputRef.current?.click();
                  }} disabled={isBusy} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2.5 text-[10px] font-medium text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5"><path strokeLinecap="round" d="M10 4v12M4 10h12" /></svg>
                    Tambah dokumen
                  </button>
                )}

                {renamedFiles.length > 1 && !hasBlockingIssue && (
                  <button
                    type="button"
                    onClick={handleSaveAllRenamedFiles}
                    disabled={isBusy}
                    className="inline-flex h-7 items-center gap-1.5 rounded-md bg-gray-900 px-2.5 text-[10px] font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-3.5 w-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v11m0 0 4-4m-4 4-4-4"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 18.5h14"
                      />
                    </svg>
                    Simpan semua
                  </button>
                )}

                {canonicalPreview && !hasBlockingIssue && (
                  <span
                    title={canonicalStudents.join(", ")}
                    className="max-w-[150px] truncate rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                  >
                    {canonicalPreview}
                  </span>
                )}
              </div>
            </div>

            <ul className={`${compactQueueMode ? "min-h-0 flex-1" : "max-h-[194px]"} divide-y divide-gray-100 overflow-y-auto`}>
              {sortedDisplayFiles.map((displayFile) => {
                const fileKey = displayFile.fileKey;
                const status = getFileStatus(displayFile);
                const matchMethod = getMatchMethod(displayFile);

                const showManualTasks =
                  firstOutputKeyByFile.get(fileKey) ===
                  displayFile.outputKey;

                const unresolvedTasks =
                  unresolvedTasksByFile[fileKey] ?? [];

                const claimedRows =
                  fileStudentMatches[fileKey]?.rowIndexes ?? [];

                return (
                  <li
                    key={displayFile.outputKey}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
                        <span className="text-[10px] font-bold">PDF</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            title={displayFile.displayName}
                            className="block min-w-0 truncate text-xs font-medium text-gray-700"
                          >
                            {displayFile.displayName}
                          </span>

                          {displayFile.virtual &&
                            displayFile.documentType === "kk" && (
                              <span className="shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600">
                                Shared KK
                              </span>
                            )}
                        </div>

                        {displayFile.renamed && (
                          <span
                            title={displayFile.originalName}
                            className="mt-0.5 block max-w-[280px] truncate text-[10px] text-gray-400"
                          >
                            Asli: {displayFile.originalName}
                          </span>
                        )}

                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>

                          {matchMethod && !conflictMsg && (
                            <span className="text-[10px] text-gray-400">
                              {matchMethod}
                            </span>
                          )}
                        </div>

                        {showManualTasks &&
                          unresolvedTasks.map((task) => {
                            const pickerKey =
                              `${fileKey}::${task.taskKey}`;

                            const isOpen =
                              resolvingTaskKey === pickerKey;

                            const options =
                              getTaskOptions(task);

                            return (
                              <div
                                key={task.taskKey}
                                className="mt-2 rounded-lg border border-amber-100 bg-amber-50/70 p-2.5"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 text-[10px] font-bold text-amber-600">
                                    !
                                  </span>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold text-amber-800">
                                      {task.detectedName}
                                    </p>

                                    <p className="mt-0.5 text-[10px] leading-4 text-amber-700">
                                      {task.reason === "duplicate-name"
                                        ? "Nama ini ditemukan pada lebih dari satu murid."
                                        : "AI belum cukup yakin menentukan murid yang sesuai."}
                                    </p>

                                    {!isOpen ? (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setResolvingTaskKey(
                                              pickerKey
                                            );
                                            setStudentSearch("");
                                          }}
                                          className="inline-flex h-6 items-center rounded-md bg-amber-100 px-2 text-[10px] font-medium text-amber-800 transition hover:bg-amber-200"
                                        >
                                          Pilih murid
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            onIgnoreStudent(
                                              fileKey,
                                              task.taskKey
                                            )
                                          }
                                          className="inline-flex h-6 items-center rounded-md bg-white px-2 text-[10px] font-medium text-gray-500 ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-gray-700"
                                        >
                                          Bukan murid sekolah ini
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="mt-2 w-[240px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                                        <div className="border-b border-gray-100 p-1.5">
                                          <input
                                            autoFocus
                                            type="text"
                                            value={studentSearch}
                                            onChange={(event) =>
                                              setStudentSearch(
                                                event.target.value
                                              )
                                            }
                                            placeholder="Cari nama murid..."
                                            className="h-7 w-full rounded-md bg-gray-50 px-2 text-[10px] text-gray-700 outline-none placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-blue-200"
                                          />
                                        </div>

                                        <div className="max-h-[140px] overflow-y-auto p-1">
                                          {options.map((student) => {
                                            const alreadyClaimed =
                                              claimedRows.includes(
                                                student.rowIndex
                                              );

                                            return (
                                              <button
                                                key={student.rowIndex}
                                                type="button"
                                                disabled={
                                                  alreadyClaimed
                                                }
                                                onClick={() => {
                                                  onResolveStudent(
                                                    fileKey,
                                                    task.taskKey,
                                                    student.rowIndex
                                                  );
                                                  closeStudentPicker();
                                                }}
                                                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[10px] text-gray-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-300"
                                              >
                                                <span className="truncate">
                                                  {student.nama}
                                                </span>

                                                {alreadyClaimed && (
                                                  <span className="shrink-0 text-[9px]">
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

                                        <div className="border-t border-gray-100 p-1.5">
                                          <button
                                            type="button"
                                            onClick={closeStudentPicker}
                                            className="w-full rounded-md py-1 text-[10px] text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {displayFile.renamed && !hasBlockingIssue && (
                        <button
                          type="button"
                          onClick={() =>
                            handleSaveRenamedFile(displayFile)
                          }
                          disabled={isBusy}
                          title="Simpan file dengan nama baru"
                          className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Simpan ${displayFile.displayName}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4v11m0 0 4-4m-4 4-4-4"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 18.5h14"
                            />
                          </svg>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onRemoveFile(
                            displayFile.fileKey,
                            displayFile.studentRowIndex
                          )
                        }
                        disabled={isBusy}
                        title="Hapus file sumber"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Hapus ${displayFile.displayName}`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {conflictMsg && (
          <div className="mt-4 shrink-0 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-2">
                <span className="text-xs font-semibold text-red-500">
                  !
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-red-700">
                    Dokumen tidak sesuai
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-red-600">
                    {conflictMsg}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onResetSession}
                disabled={isBusy}
                className="inline-flex h-7 shrink-0 items-center rounded-md bg-red-100 px-2.5 text-[10px] font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mulai ulang
              </button>
            </div>
          </div>
        )}

        {duplicateMsg && !conflictMsg && (
          <div className="mt-4 shrink-0 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <div className="flex gap-2">
              <span className="text-xs font-semibold text-amber-600">
                !
              </span>
              <div>
                <p className="text-xs font-medium text-amber-800">
                  Dokumen ganda
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-amber-700">
                  {duplicateMsg}
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 shrink-0 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex gap-2">
              <span>!</span>
              <span className="whitespace-pre-line">
                {errorMsg}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}