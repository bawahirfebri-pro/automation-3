import { useState } from "react";

import type { DocumentDisplayFile } from "@/types/document-file";
import type { StudentRecord } from "@/types/student";
import type { FileStudentMatch } from "@/lib/file-student-matcher";

interface ManualCandidate {
  rowIndex: number;
  nama: string;
  score: number;
}

interface UploadSectionProps {
  files: File[];
  displayFiles: DocumentDisplayFile[];
  fileStudentMatches: Record<string, FileStudentMatch>;
  manualCandidateRows: Record<string, ManualCandidate[]>;
  students: StudentRecord[];
  processedFileKeys: string[];
  aiMatchingFileKeys: string[];
  isExtracting: boolean;
  errorMsg: string;
  conflictMsg: string;
  duplicateMsg: string;
  sessionReady: boolean;
  hasPendingFiles: boolean;
  onFileChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onRemoveFile: (index: number) => void;
  onResetSession: () => void;
  onResolveStudent: (
    fileKey: string,
    rowIndex: number
  ) => void;
}

interface FileStatus {
  label: string;
  className: string;
}

export default function UploadSection({
  files,
  displayFiles,
  fileStudentMatches,
  manualCandidateRows,
  students,
  processedFileKeys,
  aiMatchingFileKeys,
  isExtracting,
  errorMsg,
  conflictMsg,
  duplicateMsg,
  sessionReady,
  hasPendingFiles,
  onFileChange,
  onRemoveFile,
  onResetSession,
  onResolveStudent,
}: UploadSectionProps) {
  const [resolvingFileKey, setResolvingFileKey] =
    useState("");
  const [studentSearch, setStudentSearch] =
    useState("");

  const processedFiles =
    new Set(processedFileKeys);

  const aiMatchingFiles =
    new Set(aiMatchingFileKeys);

  const hasBlockingIssue =
    Boolean(
      conflictMsg ||
      duplicateMsg
    );

  const renamedFiles =
    displayFiles.filter(
      (displayFile) =>
        displayFile.renamed
    );

  const canonicalPreview =
    renamedFiles.length > 0
      ? renamedFiles[0].displayName
          .replace(
            /_kk-akta\.pdf$/i,
            ""
          )
          .replace(
            /_kk\.pdf$/i,
            ""
          )
          .replace(
            /_akta\.pdf$/i,
            ""
          )
          .replace(
            /\.pdf$/i,
            ""
          )
          .replace(
            /_/g,
            " "
          )
          .trim()
      : "";

  /*
   * ============================================================
   * MANUAL PICKER
   * ============================================================
   */

  const getManualStudentOptions =
    (
      fileKey: string
    ): StudentRecord[] => {
      const search =
        studentSearch
          .trim()
          .toLowerCase();

      if (search) {
        return students
          .filter((student) =>
            student.nama
              .toLowerCase()
              .includes(
                search
              )
          )
          .slice(0, 8);
      }

      const fuzzyCandidates =
        manualCandidateRows[
          fileKey
        ] || [];

      if (
        fuzzyCandidates.length >
        0
      ) {
        return fuzzyCandidates
          .map(
            (candidate) =>
              students.find(
                (student) =>
                  student.rowIndex ===
                  candidate.rowIndex
              )
          )
          .filter(
            (
              student
            ): student is StudentRecord =>
              Boolean(
                student
              )
          )
          .slice(0, 5);
      }

      return students.slice(
        0,
        8
      );
    };

  /*
   * ============================================================
   * STATUS PER FILE
   * ============================================================
   */

  const getFileStatus = (
    displayFile?: DocumentDisplayFile
  ): FileStatus => {
    if (!displayFile) {
      return {
        label: "Siap",
        className:
          "bg-gray-100 text-gray-500",
      };
    }

    const fileKey =
      displayFile.fileKey;

    const fileMatch =
      fileStudentMatches[
        fileKey
      ];

    const isProcessed =
      processedFiles.has(
        fileKey
      );

    const isAiMatching =
      aiMatchingFiles.has(
        fileKey
      );

    if (
      conflictMsg &&
      fileMatch?.rowIndex !=
        null
    ) {
      return {
        label: "Konflik",
        className:
          "bg-red-50 text-red-600",
      };
    }

    if (isAiMatching) {
      return {
        label:
          "Mencocokkan",
        className:
          "bg-violet-50 text-violet-700",
      };
    }

    if (
      fileMatch?.source ===
        "unmatched" &&
      fileMatch.rowIndex ===
        null
    ) {
      return {
        label:
          "Perlu dipilih",
        className:
          "bg-amber-50 text-amber-700",
      };
    }

    if (
      fileMatch?.rowIndex !=
        null &&
      displayFile.documentType &&
      isProcessed
    ) {
      return {
        label: "Berhasil",
        className:
          "bg-emerald-50 text-emerald-700",
      };
    }

    if (
      !isProcessed &&
      (
        isExtracting ||
        hasPendingFiles
      )
    ) {
      return {
        label:
          "Memproses",
        className:
          "bg-blue-50 text-blue-600",
      };
    }

    if (isProcessed) {
      return {
        label:
          "Mengidentifikasi",
        className:
          "bg-gray-100 text-gray-600",
      };
    }

    return {
      label: "Siap",
      className:
        "bg-gray-100 text-gray-500",
    };
  };

  const getMatchMethod = (
    displayFile?: DocumentDisplayFile
  ) => {
    if (!displayFile) {
      return "";
    }

    const match =
      fileStudentMatches[
        displayFile.fileKey
      ];

    if (
      !match ||
      match.rowIndex === null
    ) {
      return "";
    }

    if (
      match.source === "exact"
    ) {
      return "Cocok otomatis";
    }

    if (
      match.source === "fuzzy"
    ) {
      return "Cocok berdasarkan kemiripan";
    }

    if (
      match.source === "ai"
    ) {
      return "Cocok dengan bantuan AI";
    }

    if (
      match.source ===
      "manual"
    ) {
      return "Dipilih manual";
    }

    return "";
  };

  /*
   * ============================================================
   * DOWNLOAD RENAMED FILE
   * ============================================================
   */

  const handleSaveRenamedFile =
    (
      displayFile: DocumentDisplayFile
    ) => {
      if (
        !displayFile.renamed ||
        hasBlockingIssue
      ) {
        return;
      }

      const url =
        URL.createObjectURL(
          displayFile.file
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href = url;

      anchor.download =
        displayFile.displayName;

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();

      window.setTimeout(
        () => {
          URL.revokeObjectURL(
            url
          );
        },
        1000
      );
    };

  const handleSaveAllRenamedFiles =
    () => {
      if (
        hasBlockingIssue
      ) {
        return;
      }

      renamedFiles.forEach(
        (
          displayFile,
          index
        ) => {
          window.setTimeout(
            () => {
              handleSaveRenamedFile(
                displayFile
              );
            },
            index * 150
          );
        }
      );
    };

  const closeStudentPicker =
    () => {
      setResolvingFileKey(
        ""
      );

      setStudentSearch("");
    };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="flex h-[516px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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

          <div>
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
        <label
          className={`group flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${
            isExtracting
              ? "cursor-not-allowed border-gray-200 bg-gray-50"
              : "cursor-pointer border-gray-300 bg-gray-50/70 hover:border-blue-400 hover:bg-blue-50/40"
          }`}
        >
          {isExtracting ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
              </div>

              <span className="text-sm font-semibold text-gray-700">
                Sedang memproses dokumen
              </span>

              <span className="mt-1 max-w-[280px] text-xs leading-5 text-gray-400">
                AI sedang membaca dan mengekstrak data dari dokumen. Mohon tunggu beberapa saat.
              </span>
            </>
          ) : (
            <>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-100 transition-colors group-hover:text-blue-500">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 3.75h6.5L18.25 8.5V20A1.25 1.25 0 0 1 17 21.25H7A1.25 1.25 0 0 1 5.75 20V5A1.25 1.25 0 0 1 7 3.75Z"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 3.75V8.5h4.75"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 14h6M12 11v6"
                  />
                </svg>
              </div>

              <span className="text-sm font-medium text-gray-700">
                Pilih dokumen PDF
              </span>

              <span className="mt-1 text-xs text-gray-400">
                File akan langsung diekstrak setelah dipilih
              </span>
            </>
          )}

          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={
              onFileChange
            }
            disabled={
              isExtracting
            }
            className="hidden"
          />
        </label>

        {files.length > 0 && (
          <div className="mt-5 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50">
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
                  {files.length} dokumen dipilih
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {renamedFiles.length >
                  1 &&
                  !hasBlockingIssue && (
                    <button
                      type="button"
                      onClick={
                        handleSaveAllRenamedFiles
                      }
                      disabled={
                        isExtracting
                      }
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

                {canonicalPreview &&
                  !hasBlockingIssue && (
                    <span
                      title={
                        canonicalPreview
                      }
                      className="max-w-[150px] truncate rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
                    >
                      {
                        canonicalPreview
                      }
                    </span>
                  )}
              </div>
            </div>

            <ul className="max-h-[194px] divide-y divide-gray-100 overflow-y-auto">
              {files.map(
                (
                  file,
                  index
                ) => {
                  const displayFile =
                    displayFiles[
                      index
                    ];

                  const status =
                    getFileStatus(
                      displayFile
                    );

                  const displayName =
                    displayFile
                      ?.displayName ||
                    file.name;

                  const fileMatch =
                    displayFile
                      ? fileStudentMatches[
                          displayFile
                            .fileKey
                        ]
                      : undefined;

                  const matchMethod =
                    getMatchMethod(
                      displayFile
                    );

                  const isUnmatched =
                    fileMatch
                      ?.source ===
                      "unmatched" &&
                    fileMatch.rowIndex ===
                      null;

                  const manualOptions =
                    displayFile
                      ? getManualStudentOptions(
                          displayFile
                            .fileKey
                        )
                      : [];

                  return (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
                          <span className="text-[10px] font-bold">
                            PDF
                          </span>
                        </div>

                        <div className="min-w-0">
                          <span
                            title={
                              displayName
                            }
                            className="block truncate text-xs font-medium text-gray-700"
                          >
                            {
                              displayName
                            }
                          </span>

                          {displayFile
                            ?.renamed && (
                            <span
                              title={
                                file.name
                              }
                              className="mt-0.5 block max-w-[280px] truncate text-[10px] text-gray-400"
                            >
                              Asli:{" "}
                              {
                                file.name
                              }
                            </span>
                          )}

                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                            >
                              {
                                status.label
                              }
                            </span>

                            {matchMethod &&
                              !conflictMsg && (
                                <span className="text-[10px] text-gray-400">
                                  {
                                    matchMethod
                                  }
                                </span>
                              )}
                          </div>

                          {isUnmatched &&
                            displayFile && (
                              <div className="relative mt-1.5">
                                {resolvingFileKey ===
                                displayFile.fileKey ? (
                                  <div className="w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                                    <div className="border-b border-gray-100 p-1.5">
                                      <input
                                        autoFocus
                                        type="text"
                                        value={
                                          studentSearch
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setStudentSearch(
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                        placeholder="Cari nama murid..."
                                        className="h-7 w-full rounded-md bg-gray-50 px-2 text-[10px] text-gray-700 outline-none placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-blue-200"
                                      />
                                    </div>

                                    <div className="max-h-[140px] overflow-y-auto p-1">
                                      {manualOptions.map(
                                        (
                                          student
                                        ) => (
                                          <button
                                            key={
                                              student.rowIndex
                                            }
                                            type="button"
                                            onClick={() => {
                                              onResolveStudent(
                                                displayFile.fileKey,
                                                student.rowIndex
                                              );

                                              closeStudentPicker();
                                            }}
                                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[10px] text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                                          >
                                            <span className="truncate">
                                              {
                                                student.nama
                                              }
                                            </span>
                                          </button>
                                        )
                                      )}

                                      {manualOptions.length ===
                                        0 && (
                                        <div className="px-2 py-3 text-center text-[10px] text-gray-400">
                                          Murid tidak ditemukan
                                        </div>
                                      )}
                                    </div>

                                    <div className="border-t border-gray-100 p-1.5">
                                      <button
                                        type="button"
                                        onClick={
                                          closeStudentPicker
                                        }
                                        className="w-full rounded-md py-1 text-[10px] text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResolvingFileKey(
                                        displayFile.fileKey
                                      );

                                      setStudentSearch(
                                        ""
                                      );
                                    }}
                                    className="inline-flex h-6 items-center rounded-md bg-amber-50 px-2 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
                                  >
                                    Pilih murid
                                  </button>
                                )}
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {displayFile
                          ?.renamed &&
                          !hasBlockingIssue && (
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveRenamedFile(
                                  displayFile
                                )
                              }
                              disabled={
                                isExtracting
                              }
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
                              index
                            )
                          }
                          disabled={
                            isExtracting
                          }
                          title="Hapus file"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Hapus ${displayName}`}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                }
              )}
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
                    Dokumen berbeda siswa
                  </p>

                  <p className="mt-0.5 text-[11px] leading-4 text-red-600">
                    {
                      conflictMsg
                    }
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  onResetSession
                }
                disabled={
                  isExtracting
                }
                className="inline-flex h-7 shrink-0 items-center rounded-md bg-red-100 px-2.5 text-[10px] font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mulai ulang
              </button>
            </div>
          </div>
        )}

        {duplicateMsg &&
          !conflictMsg && (
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
                    {
                      duplicateMsg
                    }
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
                {
                  errorMsg
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}