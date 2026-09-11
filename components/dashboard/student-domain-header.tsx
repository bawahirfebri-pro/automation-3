export type StudentDomainTab =
  "profile" | "academic" | "extracurricular" | "assistance" | "achievements";

interface StudentDomainHeaderProps {
  activeTab: StudentDomainTab;
  canOpenProfile?: boolean;
  onTabChange?: (tab: StudentDomainTab) => void;
  onUpload?: () => void;
  isUploading?: boolean;
}

const tabs: { id: StudentDomainTab; label: string; available: boolean }[] = [
  { id: "profile", label: "Profile", available: true },
  { id: "academic", label: "Akademik", available: false },
  { id: "extracurricular", label: "Ekstrakurikuler", available: false },
  { id: "assistance", label: "Bantuan Pendidikan", available: false },
  { id: "achievements", label: "Prestasi", available: false },
];

export default function StudentDomainHeader({
  activeTab,
  canOpenProfile = false,
  onTabChange,
  onUpload,
  isUploading = false,
}: StudentDomainHeaderProps) {
  return (
    <header className="shrink-0 border-b border-gray-200/70 bg-white">
      <div className="px-4 pt-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-[-0.01em] text-gray-900">Murid</h1>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Kelola data, dokumen, akademik, dan riwayat murid.
            </p>
          </div>

          <button
            type="button"
            onClick={onUpload}
            disabled={!onUpload || isUploading}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-gray-900 px-3 text-[11px] font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isUploading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Memproses
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-3.5 w-3.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15v4h14v-4" />
                </svg>
                Upload
              </>
            )}
          </button>
        </div>

        <nav className="mt-2.5 flex min-w-0 gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const disabled = !tab.available || (tab.id === "profile" && !canOpenProfile);

            return (
              <button
                key={tab.id}
                type="button"
                disabled={disabled}
                onClick={() => onTabChange?.(tab.id)}
                className={`relative shrink-0 pb-2 text-[12px] transition-colors ${
                  isActive
                    ? "font-medium text-gray-900"
                    : disabled
                      ? "cursor-default text-gray-300"
                      : "font-normal text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab.label}

                {isActive && <span className="absolute inset-x-0 bottom-0 h-px bg-gray-900" />}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
