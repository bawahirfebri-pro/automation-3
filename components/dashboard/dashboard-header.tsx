interface DashboardHeaderProps {
  sectionLabel?: string;
  pageLabel?: string;
}

export default function DashboardHeader({
  sectionLabel = "Murid",
  pageLabel = "Dokumen",
}: DashboardHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200/70 bg-[#FBFBFB] px-4">
      <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
        <span className="font-medium text-gray-700">{sectionLabel}</span>
        <span className="text-gray-300">/</span>
        <span className="truncate text-gray-400">{pageLabel}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-200/40 hover:text-gray-700"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
            />
          </svg>
        </button>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <button
          type="button"
          aria-label="Profil pengguna"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-200/60 text-[10px] font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          FB
        </button>
      </div>
    </header>
  );
}
