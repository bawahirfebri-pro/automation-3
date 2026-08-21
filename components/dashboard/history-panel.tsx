"use client";

import { useMemo, useState } from "react";

import type {
  ExtractionHistoryItem,
  HistorySaveStatus,
} from "@/types/extraction-history";

interface HistoryPanelProps {
  history: ExtractionHistoryItem[];
  activeId?: string;
  isViewingHistory: boolean;
  savingHistoryId: string;
  saveStatus: Record<string, HistorySaveStatus>;
  saveMessage: Record<string, string>;
  onSelect: (item: ExtractionHistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onBackToActive: () => void;
  onSave: (item: ExtractionHistoryItem) => void | Promise<void>;
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStudentName(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export default function HistoryPanel({
  history,
  activeId,
  isViewingHistory,
  savingHistoryId,
  saveStatus,
  saveMessage,
  onSelect,
  onRemove,
  onClear,
  onBackToActive,
  onSave,
}: HistoryPanelProps) {
  const [search, setSearch] = useState("");

  const filteredHistory = useMemo(() => {
    const keyword = normalizeSearch(search);

    if (!keyword) {
      return history;
    }

    return history.filter((item) =>
      normalizeSearch(item.studentName).includes(keyword)
    );
  }, [history, search]);

  const handleClearAll = () => {
    const confirmed = window.confirm(
      "Hapus seluruh riwayat ekstraksi?"
    );

    if (!confirmed) {
      return;
    }

    onClear();
  };

  return (
    <section className="col-span-12 h-full lg:col-span-6">
      <div className="flex h-full min-h-[484px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* Header */}
        <div className="flex min-h-[73px] items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
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
                  d="M12 8v4l2.5 1.5"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 8.25A8 8 0 1 1 4 12"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4.75v3.5h3.5"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">
                Riwayat Ekstraksi
              </h2>

              <p className="truncate text-xs text-gray-500">
                {history.length} data tersimpan • otomatis terhapus setelah 12 jam
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {isViewingHistory && (
              <button
                type="button"
                onClick={onBackToActive}
                className="text-[11px] font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                Kembali ke file aktif
              </button>
            )}

            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-medium text-gray-400 transition-colors hover:text-red-500"
              >
                Hapus semua
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {history.length > 0 && (
          <div className="border-b border-gray-100 px-5 py-3">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                />
                <path
                  strokeLinecap="round"
                  d="m16 16 4 4"
                />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nama siswa..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50/70 py-2 pl-9 pr-3 text-xs text-gray-700 outline-none transition focus:border-gray-300 focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Belum ada riwayat
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Hasil ekstraksi siswa akan muncul di sini.
              </p>
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Riwayat tidak ditemukan
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Coba gunakan kata pencarian lain.
              </p>
            </div>
          </div>
        ) : (
          /* History List */
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-gray-100">
              {filteredHistory.map((item) => {
                const isActive =
                  item.id === activeId;

                const isSaving =
                  savingHistoryId === item.id;

                const updatedAtTime =
                  new Date(item.updatedAt).getTime();

                const savedAtTime =
                  item.savedToSheetAt
                    ? new Date(item.savedToSheetAt).getTime()
                    : 0;

                const persistedSuccess =
                  savedAtTime > 0 &&
                  savedAtTime >= updatedAtTime;

                const itemSaveStatus =
                  saveStatus[item.id] ||
                  (persistedSuccess
                    ? "success"
                    : "idle");

                return (
                  <li key={item.id}>
                    <div
                      className={`group px-5 py-3.5 transition-colors ${
                        isActive
                          ? "bg-gray-50"
                          : "hover:bg-gray-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Student Detail */}
                        <button
                          type="button"
                          onClick={() => onSelect(item)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <p
                              className={`truncate text-sm ${
                                isActive
                                  ? "font-semibold text-gray-900"
                                  : "font-medium text-gray-800"
                              }`}
                            >
                              {formatStudentName(
                                item.studentName
                              )}
                            </p>

                            {isActive && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                              KK {item.kk ? "✓" : "—"}
                            </span>

                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                              Akta {item.akta ? "✓" : "—"}
                            </span>

                            <span className="text-[10px] text-gray-400">
                              {formatDate(
                                item.updatedAt
                              )}
                            </span>
                          </div>
                        </button>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSave(item)}
                            disabled={
                              isSaving ||
                              !!savingHistoryId ||
                              (!item.kk && !item.akta)
                            }
                            title={
                              itemSaveStatus === "success"
                                ? "Sudah tersimpan ke Google Sheet"
                                : itemSaveStatus === "error"
                                  ? "Coba simpan lagi"
                                  : "Simpan ke Google Sheet"
                            }
                            className={`inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[10px] font-medium transition-colors ${
                              itemSaveStatus === "success"
                                ? "bg-emerald-100 text-emerald-700"
                                : itemSaveStatus === "error"
                                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                                  : isSaving
                                    ? "cursor-wait bg-blue-100 text-blue-600"
                                    : "bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                            }`}
                          >
                            {isSaving
                              ? "Menyimpan..."
                              : itemSaveStatus === "success"
                                ? "Tersimpan"
                                : itemSaveStatus === "error"
                                  ? "Ulangi"
                                  : "Simpan"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onRemove(item.id)
                            }
                            disabled={isSaving}
                            title="Hapus riwayat"
                            aria-label={`Hapus riwayat ${item.studentName}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
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
                                d="M6.5 7.5h11M9 7.5V5.75h6V7.5M8.25 7.5l.5 10.75h6.5l.5-10.75"
                              />
                              <path
                                strokeLinecap="round"
                                d="M10.5 10.5v4.5M13.5 10.5v4.5"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Error Message */}
                      {itemSaveStatus === "error" &&
                        saveMessage[item.id] && (
                          <p className="mt-2 text-[10px] text-red-500">
                            {saveMessage[item.id]}
                          </p>
                        )}

                      {/* Saved Information */}
                      {itemSaveStatus === "success" &&
                        item.savedToSheetAt && (
                          <p className="mt-2 text-[10px] text-gray-400">
                            Disimpan ke Google Sheet{" "}
                            {formatDate(
                              item.savedToSheetAt
                            )}
                          </p>
                        )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}