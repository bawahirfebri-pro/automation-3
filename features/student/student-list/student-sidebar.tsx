"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentRecord } from "@/types/student";

import StudentFilters from "@/features/student/student-list/student-filters";
import StudentListItem from "@/features/student/student-list/student-list-item";

interface StudentSidebarProps {
  students: StudentRecord[];
  history: ExtractionHistoryItem[];
  loading: boolean;
  error: string;
  activeRowIndex?: number | null;
  priorityRowIndexes?: number[];
  footer?: ReactNode;
  onSelect: (student: StudentRecord) => void;
  onRefresh: () => void | Promise<void>;
}

type StudentTab = "detected" | "all";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function StudentSidebar({
  students,
  history,
  loading,
  error,
  activeRowIndex,
  priorityRowIndexes = [],
  footer,
  onSelect,
  onRefresh,
}: StudentSidebarProps) {
  const [search, setSearch] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedRombel, setSelectedRombel] = useState("");

  const hasActiveFilter = Boolean(search || selectedKelas || selectedRombel);

  const [tabSelection, setTabSelection] = useState<{ detectedKey: string; tab: StudentTab }>({
    detectedKey: "",
    tab: "all",
  });

  const studentRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  const previousDetectedKeyRef = useRef("");
  const lastAutoScrolledKeyRef = useRef("");

  const historyMap = useMemo(
    () => new Map(history.map((item) => [normalize(item.studentName), item])),
    [history],
  );

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
    if (detectedKey === previousDetectedKeyRef.current) {
      return;
    }

    previousDetectedKeyRef.current = detectedKey;
    lastAutoScrolledKeyRef.current = "";

    setSearch("");
    setSelectedKelas("");
    setSelectedRombel("");

    if (detectedCount === 0) {
      return;
    }

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
    if (!hasSingleDetected || !detectedKey) {
      return;
    }

    if (lastAutoScrolledKeyRef.current === detectedKey) {
      return;
    }

    const rowIndex = detectedRowIndexes[0];

    if (rowIndex === undefined) {
      return;
    }

    const targetVisible = visibleStudents.some((student) => student.rowIndex === rowIndex);

    if (!targetVisible) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = studentRefs.current.get(rowIndex);

      if (!element) {
        return;
      }

      lastAutoScrolledKeyRef.current = detectedKey;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasSingleDetected, detectedKey, detectedRowIndexes, visibleStudents]);

  const handleKelasChange = (value: string) => {
    setSelectedKelas(value);
    setSelectedRombel("");
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedKelas("");
    setSelectedRombel("");
  };

  const handleTabChange = (tab: StudentTab) => {
    setTabSelection({ detectedKey, tab });

    setSearch("");
    setSelectedKelas("");
    setSelectedRombel("");
  };

  return (
    <aside className="flex h-full w-[304px] shrink-0 flex-col border-l border-gray-200/70 bg-[#FBFBFB]">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200/70 px-3">
        <div>
          <h2 className="text-[12px] font-medium tracking-[-0.01em] text-gray-800">
            {showingDetectedTab ? "Murid Terdeteksi" : "Daftar Murid"}
          </h2>

          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400">
            <span>{visibleStudents.length} murid</span>

            {!showingDetectedTab && visibleStudents.length !== students.length ? (
              <>
                <span className="text-gray-300">·</span>
                <span>dari {students.length}</span>
              </>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={loading}
          aria-label="Refresh daftar murid"
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-200/40 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`h-4 w-4 transition-transform ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
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

      {hasMultipleDetected ? (
        <div className="shrink-0 border-b border-gray-200/70 px-3 pt-2">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleTabChange("detected")}
              className={`relative pb-2 text-[11px] transition-colors ${
                activeTab === "detected"
                  ? "font-medium text-gray-900"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Terdeteksi
              <span className="ml-1.5 text-[10px] text-gray-400">{detectedCount}</span>
              {activeTab === "detected" ? (
                <span className="absolute inset-x-0 bottom-0 h-px bg-gray-900" />
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("all")}
              className={`relative pb-2 text-[11px] transition-colors ${
                activeTab === "all"
                  ? "font-medium text-gray-900"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Semua
              {activeTab === "all" ? (
                <span className="absolute inset-x-0 bottom-0 h-px bg-gray-900" />
              ) : null}
            </button>
          </div>
        </div>
      ) : null}

      {!showingDetectedTab ? (
        <StudentFilters
          search={search}
          selectedKelas={selectedKelas}
          selectedRombel={selectedRombel}
          kelasOptions={kelasOptions}
          rombelOptions={rombelOptions}
          hasActiveFilter={hasActiveFilter}
          onSearchChange={setSearch}
          onKelasChange={handleKelasChange}
          onRombelChange={setSelectedRombel}
          onReset={handleResetFilters}
        />
      ) : null}

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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-1.5">
          <ul className="space-y-0.5">
            {visibleStudents.map((student) => (
              <StudentListItem
                key={student.rowIndex}
                student={student}
                historyItem={historyMap.get(normalize(student.nama))}
                isActive={activeRowIndex === student.rowIndex}
                isDetected={detectedSet.has(student.rowIndex)}
                showingDetectedTab={showingDetectedTab}
                onSelect={onSelect}
                itemRef={(element) => {
                  if (element) {
                    studentRefs.current.set(student.rowIndex, element);
                  } else {
                    studentRefs.current.delete(student.rowIndex);
                  }
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {footer}
    </aside>
  );
}
