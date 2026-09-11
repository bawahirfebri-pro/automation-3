"use client";

import { useMemo } from "react";

import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentRecord } from "@/types/student";

interface StudentDocumentWorkflowProps {
  students: StudentRecord[];
  history: ExtractionHistoryItem[];
  activeRowIndex?: number | null;
  priorityRowIndexes?: number[];
  savingStudentId: string;
  saveFeedback: Record<string, "idle" | "success" | "error">;
  savingAll?: boolean;
  onSave: (student: StudentRecord) => void | Promise<void>;
  onSaveAll?: (students: StudentRecord[]) => void | Promise<void>;
}

type DocumentStatus = "complete" | "ready" | "missing";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getDocumentStatus(completeStored: boolean, availableLocally: boolean): DocumentStatus {
  if (completeStored) return "complete";
  if (availableLocally) return "ready";
  return "missing";
}

function getStatusLabel(status: DocumentStatus): string {
  if (status === "complete") return "Tersimpan";
  if (status === "ready") return "Siap disimpan";
  return "Belum tersedia";
}

function getStatusClass(status: DocumentStatus): string {
  if (status === "complete") return "text-emerald-600";
  if (status === "ready") return "text-amber-600";
  return "text-gray-400";
}

export default function StudentDocumentWorkflow({
  students,
  history,
  activeRowIndex,
  priorityRowIndexes = [],
  savingStudentId,
  saveFeedback,
  savingAll = false,
  onSave,
  onSaveAll,
}: StudentDocumentWorkflowProps) {
  const historyMap = useMemo(
    () => new Map(history.map((item) => [normalize(item.studentName), item])),
    [history],
  );

  const activeStudent =
    activeRowIndex === null || activeRowIndex === undefined
      ? null
      : (students.find((student) => student.rowIndex === activeRowIndex) ?? null);

  const detectedStudents = useMemo(() => {
    const detectedSet = new Set(priorityRowIndexes.filter(Number.isInteger));

    return students.filter((student) => detectedSet.has(student.rowIndex));
  }, [students, priorityRowIndexes]);

  const detectedStudentsReadyToSave = useMemo(
    () =>
      detectedStudents.filter((student) => {
        const localItem = historyMap.get(normalize(student.nama));
        if (!localItem) return false;

        return (
          (!student.kkComplete && Boolean(localItem.kk)) ||
          (!student.aktaComplete && Boolean(localItem.akta))
        );
      }),
    [detectedStudents, historyMap],
  );

  const canSaveAll = Boolean(onSaveAll) && detectedStudentsReadyToSave.length > 1;

  if (!activeStudent) {
    return (
      <section className="col-span-12 lg:col-span-6">
        <div className="flex h-[516px] items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-center">
          <div>
            <p className="text-[13px] font-medium text-gray-700">Belum ada murid dipilih</p>
            <p className="mt-1 text-[11px] text-gray-400">
              Pilih murid dari daftar di sebelah kanan untuk melihat status dokumen.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const normalizedStudentId = normalize(activeStudent.nama);
  const localItem = historyMap.get(normalizedStudentId);
  const kkStatus = getDocumentStatus(activeStudent.kkComplete, Boolean(localItem?.kk));
  const aktaStatus = getDocumentStatus(activeStudent.aktaComplete, Boolean(localItem?.akta));
  const canSave = kkStatus === "ready" || aktaStatus === "ready";
  const isSaving = savingStudentId === normalizedStudentId;
  const feedback = saveFeedback[normalizedStudentId] || "idle";

  return (
    <section className="col-span-12 lg:col-span-6">
      <div className="flex h-[516px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-gray-200/70 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-medium tracking-[-0.01em] text-gray-900">
              {activeStudent.nama}
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-400">
              {activeStudent.kelas || "-"}
              {activeStudent.rombel ? ` · ${activeStudent.rombel}` : ""}
            </p>
          </div>

          {canSaveAll && (
            <button
              type="button"
              onClick={() => void onSaveAll?.(detectedStudentsReadyToSave)}
              disabled={savingAll || Boolean(savingStudentId)}
              className="h-8 shrink-0 rounded-md border border-gray-200 bg-white px-2.5 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              {savingAll ? "Menyimpan..." : `Simpan Semua (${detectedStudentsReadyToSave.length})`}
            </button>
          )}
        </div>

        <div className="flex-1 p-4">
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between px-3 py-3">
              <div>
                <p className="text-[12px] font-medium text-gray-800">Kartu Keluarga</p>
                <p className="mt-0.5 text-[10px] text-gray-400">Dokumen KK murid</p>
              </div>

              <span className={`text-[11px] font-medium ${getStatusClass(kkStatus)}`}>
                {getStatusLabel(kkStatus)}
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-3">
              <div>
                <p className="text-[12px] font-medium text-gray-800">Akta Kelahiran</p>
                <p className="mt-0.5 text-[10px] text-gray-400">Dokumen akta murid</p>
              </div>

              <span className={`text-[11px] font-medium ${getStatusClass(aktaStatus)}`}>
                {getStatusLabel(aktaStatus)}
              </span>
            </div>
          </div>

          <div className="mt-4">
            {canSave ? (
              <button
                type="button"
                onClick={() => void onSave(activeStudent)}
                disabled={isSaving || Boolean(savingStudentId) || savingAll}
                className="h-9 rounded-lg bg-gray-900 px-3.5 text-[11px] font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                {isSaving ? "Menyimpan..." : "Simpan Dokumen"}
              </button>
            ) : (
              <p className="text-[11px] text-gray-400">
                Tidak ada dokumen baru yang perlu disimpan untuk murid ini.
              </p>
            )}

            {feedback === "success" && (
              <p className="mt-2 text-[11px] font-medium text-emerald-600">Dokumen tersimpan.</p>
            )}

            {feedback === "error" && (
              <p className="mt-2 text-[11px] font-medium text-red-500">Dokumen gagal disimpan.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
