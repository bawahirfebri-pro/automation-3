interface StudentFiltersProps {
  search: string;
  selectedKelas: string;
  selectedRombel: string;
  kelasOptions: string[];
  rombelOptions: string[];
  hasActiveFilter: boolean;
  onSearchChange: (value: string) => void;
  onKelasChange: (value: string) => void;
  onRombelChange: (value: string) => void;
  onReset: () => void;
}

export default function StudentFilters({
  search,
  selectedKelas,
  selectedRombel,
  kelasOptions,
  rombelOptions,
  hasActiveFilter,
  onSearchChange,
  onKelasChange,
  onRombelChange,
  onReset,
}: StudentFiltersProps) {
  return (
    <div className="shrink-0 border-b border-gray-200/70 px-3 py-2.5">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path strokeLinecap="round" d="m16 16 4 4" />
        </svg>

        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Cari nama atau NIK..."
          className="h-8 w-full rounded-md border border-gray-200 bg-white pr-8 pl-8 text-[11px] text-gray-800 transition-colors outline-none placeholder:text-gray-400 focus:border-gray-300"
        />

        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Hapus pencarian"
            className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-3 w-3"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="m6 6 8 8M14 6l-8 8" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="mt-1.5 flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <select
            value={selectedKelas}
            onChange={(event) => onKelasChange(event.target.value)}
            className="h-8 w-full appearance-none rounded-md border border-gray-200 bg-white px-2.5 pr-7 text-[11px] text-gray-600 transition-colors outline-none hover:bg-gray-50 focus:border-gray-300"
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
            className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
          </svg>
        </div>

        <div className="relative min-w-0 flex-1">
          <select
            value={selectedRombel}
            onChange={(event) => onRombelChange(event.target.value)}
            className="h-8 w-full appearance-none rounded-md border border-gray-200 bg-white px-2.5 pr-7 text-[11px] text-gray-600 transition-colors outline-none hover:bg-gray-50 focus:border-gray-300"
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
            className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 8 4 4 4-4" />
          </svg>
        </div>
      </div>

      {hasActiveFilter ? (
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="text-[9px] text-gray-400 transition-colors hover:text-gray-700"
          >
            Reset filter
          </button>
        </div>
      ) : null}
    </div>
  );
}
