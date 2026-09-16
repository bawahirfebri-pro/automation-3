import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentRecord } from "@/types/student";

type DocumentBadgeStatus = "stored" | "ready" | "missing";

interface StudentListItemProps {
  student: StudentRecord;
  historyItem?: ExtractionHistoryItem;
  isActive: boolean;
  isDetected: boolean;
  showingDetectedTab: boolean;
  onSelect: (student: StudentRecord) => void;
  itemRef?: (element: HTMLLIElement | null) => void;
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

function getStudentInitials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getDocumentBadgeStatus(stored: boolean, availableLocally: boolean): DocumentBadgeStatus {
  if (stored) return "stored";
  if (availableLocally) return "ready";
  return "missing";
}

function getDocumentBadgeClass(status: DocumentBadgeStatus): string {
  if (status === "stored") {
    return "bg-emerald-50 text-emerald-600";
  }

  if (status === "ready") {
    return "bg-amber-50 text-amber-600";
  }

  return "bg-gray-100 text-gray-400";
}

export default function StudentListItem({
  student,
  historyItem,
  isActive,
  isDetected,
  showingDetectedTab,
  onSelect,
  itemRef,
}: StudentListItemProps) {
  const kkStatus = getDocumentBadgeStatus(student.kkComplete, Boolean(historyItem?.kk));

  const aktaStatus = getDocumentBadgeStatus(student.aktaComplete, Boolean(historyItem?.akta));

  return (
    <li ref={itemRef}>
      <button
        type="button"
        onClick={() => onSelect(student)}
        className={`flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
          isActive ? "bg-gray-200/50" : "hover:bg-gray-200/30"
        }`}
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200/60 text-[10px] font-medium tracking-[-0.01em] text-gray-600">
          {getStudentInitials(student.nama)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className={`min-w-0 flex-1 truncate text-[12px] ${
                isActive ? "font-medium text-gray-900" : "font-normal text-gray-600"
              }`}
            >
              {formatStudentName(student.nama)}
            </p>

            {isDetected && !showingDetectedTab ? (
              <span className="shrink-0 rounded-md bg-gray-200/50 px-1.5 py-0.5 text-[9px] font-normal text-gray-500">
                Terdeteksi
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 truncate text-[10px] text-gray-400">
            {student.kelas || "-"}
            {student.rombel ? ` · ${student.rombel}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          <span
            className={`flex h-5 min-w-[26px] items-center justify-center rounded-md px-1.5 text-[9px] font-medium ${getDocumentBadgeClass(
              kkStatus,
            )}`}
          >
            KK
          </span>

          <span
            className={`flex h-5 min-w-[34px] items-center justify-center rounded-md px-1.5 text-[9px] font-medium ${getDocumentBadgeClass(
              aktaStatus,
            )}`}
          >
            Akta
          </span>
        </div>
      </button>
    </li>
  );
}
