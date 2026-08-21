"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentRecord } from "@/types/student";

interface StudentPanelProps {
    students: StudentRecord[];
    history: ExtractionHistoryItem[];
    loading: boolean;
    error: string;
    activeRowIndex?: number | null;
    savingStudentId: string;
    saveFeedback: Record<string, "idle" | "success" | "error">;
    onSelect: (student: StudentRecord) => void;
    onRefresh: () => void | Promise<void>;
    onSave: (student: StudentRecord) => void | Promise<void>;
}

type DocumentStatus = "complete" | "ready" | "missing";
type StatusFilter = "" | "kk-missing" | "akta-missing" | "incomplete";

function normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatStudentName(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function getDocumentStatus(
    completeOnSheet: boolean,
    availableLocally: boolean
): DocumentStatus {
    if (completeOnSheet) return "complete";
    if (availableLocally) return "ready";
    return "missing";
}

function getStatusBadge(status: DocumentStatus): string {
    if (status === "complete") return "bg-emerald-50 text-emerald-700";
    if (status === "ready") return "bg-amber-50 text-amber-700";
    return "bg-red-50 text-red-600";
}

export default function StudentPanel({
    students,
    history,
    loading,
    error,
    activeRowIndex,
    savingStudentId,
    saveFeedback,
    onSelect,
    onRefresh,
    onSave,
}: StudentPanelProps) {
    const [search, setSearch] = useState("");
    const [selectedKelas, setSelectedKelas] = useState("");
    const [selectedRombel, setSelectedRombel] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("");

    const rowRefs = useRef<Map<number, HTMLLIElement>>(new Map());

    const historyMap = useMemo(() => {
        return new Map(
            history.map((item) => [
                normalize(item.studentName),
                item,
            ])
        );
    }, [history]);

    const kelasOptions = useMemo(() => {
        return [
            ...new Set(
                students
                    .map((student) => student.kelas)
                    .filter(Boolean)
            ),
        ].sort((a, b) =>
            a.localeCompare(b, "id", { numeric: true })
        );
    }, [students]);

    const rombelOptions = useMemo(() => {
        const source = selectedKelas
            ? students.filter((student) => student.kelas === selectedKelas)
            : students;

        return [
            ...new Set(
                source
                    .map((student) => student.rombel)
                    .filter(Boolean)
            ),
        ].sort((a, b) =>
            a.localeCompare(b, "id", { numeric: true })
        );
    }, [students, selectedKelas]);

    const filteredStudents = useMemo(() => {
        const keyword = normalize(search);

        return students.filter((student) => {
            const matchSearch =
                !keyword ||
                normalize(student.nama).includes(keyword);

            const matchKelas =
                !selectedKelas ||
                student.kelas === selectedKelas;

            const matchRombel =
                !selectedRombel ||
                student.rombel === selectedRombel;

            const matchStatus =
                !selectedStatus ||
                (selectedStatus === "kk-missing" && !student.kkComplete) ||
                (selectedStatus === "akta-missing" && !student.aktaComplete) ||
                (
                    selectedStatus === "incomplete" &&
                    (!student.kkComplete || !student.aktaComplete)
                );

            return matchSearch && matchKelas && matchRombel && matchStatus;
        });
    }, [
        students,
        search,
        selectedKelas,
        selectedRombel,
        selectedStatus,
    ]);

    const stats = useMemo(() => {
        const total = filteredStudents.length;
        const kkComplete = filteredStudents.filter((student) => student.kkComplete).length;
        const aktaComplete = filteredStudents.filter((student) => student.aktaComplete).length;

        return { total, kkComplete, aktaComplete };
    }, [filteredStudents]);

    useEffect(() => {
        if (activeRowIndex == null) return;

        const target = rowRefs.current.get(activeRowIndex);
        if (!target) return;

        target.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
        });
    }, [activeRowIndex, filteredStudents]);

    const handleKelasChange = (value: string) => {
        setSelectedKelas(value);
        setSelectedRombel("");
    };

    const handleResetFilter = () => {
        setSearch("");
        setSelectedKelas("");
        setSelectedRombel("");
        setSelectedStatus("");
    };

    const hasFilter =
        !!search ||
        !!selectedKelas ||
        !!selectedRombel ||
        !!selectedStatus;

    return (
        <section className="col-span-12 h-full lg:col-span-6">
            <div className="flex h-[516px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
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
                                    d="M8.25 11a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM15.75 10a2.75 2.75 0 1 0 0-5.5"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.75 19.25v-1.5a4.5 4.5 0 0 1 4.5-4.5h2a4.5 4.5 0 0 1 4.5 4.5v1.5M14 13.25h1.75a4.5 4.5 0 0 1 4.5 4.5v1.5"
                                />
                            </svg>
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Daftar Murid
                            </h2>

                            <p className="text-xs text-gray-500">
                                {stats.total} murid
                                <span className="mx-1.5 text-gray-300">•</span>
                                KK {stats.kkComplete}/{stats.total}
                                <span className="mx-1.5 text-gray-300">•</span>
                                Akta {stats.aktaComplete}/{stats.total}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => void onRefresh()}
                        disabled={loading}
                        title="Refresh daftar murid"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7.5V4m0 0h-3.5M19 4l-3 3M5 16.5V20m0 0h3.5M5 20l3-3"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18 10a6.5 6.5 0 0 0-11.1-3.9L5 8M6 14a6.5 6.5 0 0 0 11.1 3.9L19 16"
                            />
                        </svg>
                    </button>
                </div>

                <div className="border-b border-gray-100 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                            >
                                <circle cx="11" cy="11" r="6.5" />
                                <path strokeLinecap="round" d="m16 16 4 4" />
                            </svg>

                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari nama murid..."
                                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50/70 pl-9 pr-3 text-xs text-gray-700 outline-none transition focus:border-gray-300 focus:bg-white"
                            />
                        </div>

                        <div className="relative w-[92px] shrink-0">
                            <select
                                value={selectedKelas}
                                onChange={(event) => handleKelasChange(event.target.value)}
                                className={`h-9 w-full appearance-none rounded-lg border pl-3 pr-8 text-xs font-medium outline-none transition ${selectedKelas
                                    ? "border-gray-300 bg-gray-100 text-gray-800"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                <option value="">Kelas</option>

                                {kelasOptions.map((kelas) => (
                                    <option key={kelas} value={kelas}>
                                        {kelas}
                                    </option>
                                ))}
                            </select>

                            <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
                            </svg>
                        </div>

                        <div className="relative w-[92px] shrink-0">
                            <select
                                value={selectedRombel}
                                onChange={(event) => setSelectedRombel(event.target.value)}
                                className={`h-9 w-full appearance-none rounded-lg border pl-3 pr-8 text-xs font-medium outline-none transition ${selectedRombel
                                    ? "border-gray-300 bg-gray-100 text-gray-800"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                <option value="">Rombel</option>

                                {rombelOptions.map((rombel) => (
                                    <option key={rombel} value={rombel}>
                                        {rombel}
                                    </option>
                                ))}
                            </select>

                            <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
                            </svg>
                        </div>

                        <div className="relative w-[122px] shrink-0">
                            <select
                                value={selectedStatus}
                                onChange={(event) =>
                                    setSelectedStatus(event.target.value as StatusFilter)
                                }
                                className={`h-9 w-full appearance-none rounded-lg border pl-3 pr-8 text-xs font-medium outline-none transition ${selectedStatus
                                        ? "border-gray-300 bg-gray-100 text-gray-800"
                                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                    }`}
                            >
                                <option value="">Status</option>
                                <option value="kk-missing">KK Belum</option>
                                <option value="akta-missing">Akta Belum</option>
                                <option value="incomplete">Belum Lengkap</option>
                            </select>

                            <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
                            </svg>
                        </div>

                        {hasFilter && (
                            <button
                                type="button"
                                onClick={handleResetFilter}
                                title="Reset pencarian dan filter"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    className="h-4 w-4"
                                >
                                    <path strokeLinecap="round" d="M6 6l8 8M14 6l-8 8" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {loading && students.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center px-6 text-center">
                        <div>
                            <span className="mx-auto block h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
                            <p className="mt-3 text-sm font-medium text-gray-500">
                                Memuat daftar murid
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Mengambil data dari Google Sheet.
                            </p>
                        </div>
                    </div>
                ) : error && students.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center px-6 text-center">
                        <div>
                            <p className="text-sm font-medium text-gray-600">
                                Daftar murid gagal dimuat
                            </p>
                            <p className="mt-1 max-w-[320px] text-xs text-gray-400">
                                {error}
                            </p>

                            <button
                                type="button"
                                onClick={() => void onRefresh()}
                                className="mt-3 rounded-md bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-gray-800"
                            >
                                Coba lagi
                            </button>
                        </div>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center px-6 text-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                Murid tidak ditemukan
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Coba ubah pencarian atau filter.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <ul className="divide-y divide-gray-100">
                            {filteredStudents.map((student) => {
                                const isActive = activeRowIndex === student.rowIndex;
                                const normalizedStudentId = normalize(student.nama);
                                const localItem = historyMap.get(normalizedStudentId);

                                const kkStatus = getDocumentStatus(
                                    student.kkComplete,
                                    !!localItem?.kk
                                );

                                const aktaStatus = getDocumentStatus(
                                    student.aktaComplete,
                                    !!localItem?.akta
                                );

                                const kkBadgeClass = getStatusBadge(kkStatus);
                                const aktaBadgeClass = getStatusBadge(aktaStatus);

                                const isSaving = savingStudentId === normalizedStudentId;
                                const canSave = kkStatus === "ready" || aktaStatus === "ready";
                                const feedback = saveFeedback[normalizedStudentId] || "idle";

                                return (
                                    <li
                                        key={student.rowIndex}
                                        ref={(element) => {
                                            if (element) rowRefs.current.set(student.rowIndex, element);
                                            else rowRefs.current.delete(student.rowIndex);
                                        }}
                                    >
                                        <div
                                            className={`relative flex items-center justify-between gap-4 px-5 py-3.5 transition-colors ${isActive
                                                ? "bg-blue-50/60"
                                                : "hover:bg-gray-50/80"
                                                }`}
                                        >
                                            {isActive && (
                                                <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-blue-500" />
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => onSelect(student)}
                                                className="min-w-0 flex-1 text-left"
                                            >
                                                <p
                                                    className={`truncate text-sm ${isActive
                                                        ? "font-semibold text-gray-900"
                                                        : "font-medium text-gray-800"
                                                        }`}
                                                >
                                                    {formatStudentName(student.nama)}
                                                </p>

                                                <div
                                                    className={`mt-1 text-[10px] ${isActive ? "text-gray-500" : "text-gray-400"
                                                        }`}
                                                >
                                                    {student.kelas || "-"}
                                                    {student.rombel ? ` • ${student.rombel}` : ""}
                                                </div>
                                            </button>

                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <span
                                                    title={
                                                        kkStatus === "complete"
                                                            ? "KK sudah lengkap"
                                                            : kkStatus === "ready"
                                                                ? "KK siap disimpan"
                                                                : "KK belum tersedia"
                                                    }
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${kkBadgeClass}`}
                                                >
                                                    KK
                                                </span>

                                                <span
                                                    title={
                                                        aktaStatus === "complete"
                                                            ? "Akta sudah lengkap"
                                                            : aktaStatus === "ready"
                                                                ? "Akta siap disimpan"
                                                                : "Akta belum tersedia"
                                                    }
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${aktaBadgeClass}`}
                                                >
                                                    Akta
                                                </span>

                                                {canSave && (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            void onSave(student);
                                                        }}
                                                        disabled={isSaving || !!savingStudentId}
                                                        className="ml-1 inline-flex h-7 items-center justify-center rounded-md bg-blue-600 px-2.5 text-[10px] font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                                    >
                                                        {isSaving ? "Menyimpan..." : "Simpan"}
                                                    </button>
                                                )}

                                                {feedback === "success" && (
                                                    <span className="ml-1 text-[10px] font-medium text-emerald-600">
                                                        Tersimpan
                                                    </span>
                                                )}

                                                {feedback === "error" && (
                                                    <span className="ml-1 text-[10px] font-medium text-red-500">
                                                        Gagal
                                                    </span>
                                                )}
                                            </div>
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