const tabs = [
  "Ringkasan",
  "Data",
  "Akademik",
  "Dokumen",
  "Bantuan Pendidikan",
  "Kegiatan",
  "Prestasi",
];

export default function StudentDomainHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="px-4 pt-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Murid</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Kelola data, dokumen, akademik, dan riwayat murid.
          </p>
        </div>

        <nav className="mt-3 flex min-w-0 gap-5 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab === "Dokumen";

            return (
              <button
                key={tab}
                type="button"
                className={`relative shrink-0 pb-2.5 text-[13px] transition-colors ${
                  isActive
                    ? "font-medium text-gray-900"
                    : "font-normal text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab}

                {isActive && <span className="absolute inset-x-0 bottom-0 h-px bg-gray-900" />}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
