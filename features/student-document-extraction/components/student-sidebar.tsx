"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { StudentRecord } from "@/types/student";

interface StudentSidebarProps {
  students: StudentRecord[];
  loading: boolean;
  error: string;
  activeRowIndex?: number | null;
  priorityRowIndexes?: number[];
  onSelect: (student: StudentRecord) => void;
  onRefresh: () => void | Promise<void>;
}

type StudentTab = "detected" | "all";

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

export default function StudentSidebar({
  students,
  loading,
  error,
  activeRowIndex,
  priorityRowIndexes = [],
  onSelect,
  onRefresh,
}: StudentSidebarProps) {
  const [search, setSearch] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedRombel, setSelectedRombel] = useState("");
  const [tabSelection, setTabSelection] = useState<{ detectedKey: string; tab: StudentTab }>({
    detectedKey: "",
    tab: "all",
  });

  const studentRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const previousDetectedKeyRef = useRef("");
  const lastAutoScrolledKeyRef = useRef("");

  const detectedRowIndexes = useMemo(
    () => [...new Set(priorityRowIndexes.filter(Number.isInteger))],
    [priorityRowIndexes],
  );

  const detectedSet = useMemo(() => new Set(detectedRowIndexes), [detectedRowIndexes]);

  const detectedStudents = useMemo(
    () =>
      detectedRowIndexes
        .map((rowIndex) => students.find((student) => student.rowIndex === rowIndex))
        .filter((student): student is StudentRecord => Boolean(student))
        .sort((a, b) => a.nama.localeCompare(b.nama, "id", { sensitivity: "base", numeric: true })),
    [students, detectedRowIndexes],
  );

  const detectedCount = detectedStudents.length;
  const hasMultipleDetected = detectedCount > 1;
  const hasSingleDetected = detectedCount === 1;

  const detectedKey = useMemo(
    () => [...detectedRowIndexes].sort((a, b) => a - b).join(","),
    [detectedRowIndexes],
  );

  const activeTab: StudentTab =
    tabSelection.detectedKey === detectedKey
      ? tabSelection.tab
      : hasMultipleDetected
        ? "detected"
        : "all";

  useEffect(() => {
    if (detectedKey === previousDetectedKeyRef.current) return;

    previousDetectedKeyRef.current = detectedKey;
    lastAutoScrolledKeyRef.current = "";

    setSearch("");
    setSelectedKelas("");
    setSelectedRombel("");

    if (detectedCount === 0) return;

    const firstDetectedStudent = detectedStudents[0];

    if (firstDetectedStudent && activeRowIndex !== firstDetectedStudent.rowIndex) {
      onSelect(firstDetectedStudent);
    }
  }, [detectedKey, detectedCount, detectedStudents, activeRowIndex, onSelect]);

  const kelasOptions = useMemo(
    () =>
      [...new Set(students.map((student) => student.kelas).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "id", { numeric: true }),
      ),
    [students],
  );

  const rombelOptions = useMemo(() => {
    const source = selectedKelas
      ? students.filter((student) => student.kelas === selectedKelas)
      : students;

    return [...new Set(source.map((student) => student.rombel).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "id", { numeric: true }),
    );
  }, [students, selectedKelas]);

  const filteredStudents = useMemo(() => {
    const keyword = normalize(search);

    return students.filter((student) => {
      const matchSearch =
        !keyword ||
        normalize(student.nama).includes(keyword) ||
        normalize(student.nik).includes(keyword);

      const matchKelas = !selectedKelas || student.kelas === selectedKelas;
      const matchRombel = !selectedRombel || student.rombel === selectedRombel;

      return matchSearch && matchKelas && matchRombel;
    });
  }, [students, search, selectedKelas, selectedRombel]);

  const showingDetectedTab = hasMultipleDetected && activeTab === "detected";
  const visibleStudents = showingDetectedTab ? detectedStudents : filteredStudents;

  useEffect(() => {
    if (!hasSingleDetected || !detectedKey) return;
    if (lastAutoScrolledKeyRef.current === detectedKey) return;

    const rowIndex = detectedRowIndexes[0];
    if (rowIndex === undefined) return;

    const targetVisible = visibleStudents.some((student) => student.rowIndex === rowIndex);
    if (!targetVisible) return;

    const frame = window.requestAnimationFrame(() => {
      const element = studentRefs.current.get(rowIndex);
      if (!element) return;

      lastAutoScrolledKeyRef.current = detectedKey;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasSingleDetected, detectedKey, detectedRowIndexes, visibleStudents]);

  const handleKelasChange = (value: string) => {
    setSelectedKelas(value);
    setSelectedRombel("");
  };

  const handleTabChange = (tab: StudentTab) => {
    setTabSelection({ detectedKey, tab });
    setSearch("");
    setSelectedKelas("");
    setSelectedRombel("");
  };

  return (
    <aside className="flex h-screen w-[300px] shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-4">
        <div>
          <h2 className="text-[13px] font-semibold text-gray-900">
            {showingDetectedTab ? "Murid Terdeteksi" : "Daftar Murid"}
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-400">{visibleStudents.length} murid</p>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          title="Refresh daftar murid"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
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

      {hasMultipleDetected && (
        <div className="shrink-0 border-b border-gray-100 px-3 pt-2.5">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleTabChange("detected")}
              className={`relative pb-2.5 text-[12px] transition-colors ${
                activeTab === "detected"
                  ? "font-medium text-gray-900"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Terdeteksi
              <span className="ml-1.5 text-[10px] text-gray-400">{detectedCount}</span>
              {activeTab === "detected" && (
                <span className="absolute inset-x-0 bottom-0 h-px bg-gray-900" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("all")}
              className={`relative pb-2.5 text-[12px] transition-colors ${
                activeTab === "all"
                  ? "font-medium text-gray-900"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Semua
              {activeTab === "all" && (
                <span className="absolute inset-x-0 bottom-0 h-px bg-gray-900" />
              )}
            </button>
          </div>
        </div>
      )}

      {!showingDetectedTab && (
        <div className="shrink-0 border-b border-gray-100 p-3">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path strokeLinecap="round" d="m16 16 4 4" />
            </svg>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama atau NIK..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-9 text-[12px] text-gray-800 transition-colors outline-none placeholder:text-gray-400 focus:border-gray-300"
            />
          </div>

          <div className="mt-2 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <select
                value={selectedKelas}
                onChange={(event) => handleKelasChange(event.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-[12px] text-gray-600 transition-colors outline-none hover:bg-gray-50 focus:border-gray-300"
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
                className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
              </svg>
            </div>

            <div className="relative min-w-0 flex-1">
              <select
                value={selectedRombel}
                onChange={(event) => setSelectedRombel(event.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-[12px] text-gray-600 transition-colors outline-none hover:bg-gray-50 focus:border-gray-300"
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
                className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {loading && students.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
          <div>
            <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
            <p className="mt-3 text-[12px] text-gray-500">Memuat daftar murid...</p>
          </div>
        </div>
      ) : error && students.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
          <div>
            <p className="text-[12px] font-medium text-gray-700">Daftar murid gagal dimuat</p>
            <p className="mt-1 text-[11px] leading-4 text-gray-400">{error}</p>

            <button
              type="button"
              onClick={() => void onRefresh()}
              className="mt-3 h-8 rounded-lg border border-gray-200 px-3 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Coba lagi
            </button>
          </div>
        </div>
      ) : visibleStudents.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
          <div>
            <p className="text-[12px] font-medium text-gray-600">
              {showingDetectedTab ? "Belum ada murid terdeteksi" : "Murid tidak ditemukan"}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              {showingDetectedTab
                ? "Murid dari upload aktif akan muncul di sini."
                : "Coba ubah pencarian atau filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <ul>
            {visibleStudents.map((student) => {
              const isActive = activeRowIndex === student.rowIndex;
              const isDetected = detectedSet.has(student.rowIndex);

              return (
                <li
                  key={student.rowIndex}
                  ref={(element) => {
                    if (element) studentRefs.current.set(student.rowIndex, element);
                    else studentRefs.current.delete(student.rowIndex);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(student)}
                    className={`relative flex w-full items-center px-4 py-2.5 text-left transition-colors ${
                      isActive ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-gray-900" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p
                          className={`truncate text-[12px] ${
                            isActive ? "font-medium text-gray-900" : "font-normal text-gray-700"
                          }`}
                        >
                          {formatStudentName(student.nama)}
                        </p>

                        {isDetected && (
                          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                            Terdeteksi
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 truncate text-[10px] text-gray-400">
                        {student.kelas || "-"}
                        {student.rombel ? ` · ${student.rombel}` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
