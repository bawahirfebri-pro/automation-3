import type { ReactNode } from "react";

export type DashboardDomain = "finance" | "inventory" | "students" | "teachers";

interface DashboardSidebarProps {
  activeDomain: DashboardDomain;
}

interface NavItem {
  id: DashboardDomain;
  label: string;
  icon: ReactNode;
  available: boolean;
}

const navItems: NavItem[] = [
  {
    id: "finance",
    label: "Keuangan",
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7h16M6 4h12a2 2 0 0 1 2 2v12H4V6a2 2 0 0 1 2-2Z"
        />
        <path strokeLinecap="round" d="M8 12h4M8 15h2" />
      </svg>
    ),
  },
  {
    id: "inventory",
    label: "Inventaris",
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10l8 4 8-4V7M12 11v10" />
      </svg>
    ),
  },
  {
    id: "students",
    label: "Murid",
    available: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM15.5 10a3 3 0 1 0 0-6"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.5 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M14 13h1.5a5 5 0 0 1 5 5v2"
        />
      </svg>
    ),
  },
  {
    id: "teachers",
    label: "Guru",
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="7" r="3.5" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 5h5v10h-5"
        />
      </svg>
    ),
  },
];

export default function DashboardSidebar({ activeDomain }: DashboardSidebarProps) {
  return (
    <aside className="relative z-40 hidden h-screen w-[72px] shrink-0 lg:block">
      <div className="group absolute inset-y-0 left-0 flex w-[72px] flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width,box-shadow] duration-200 ease-out hover:w-[232px] hover:shadow-lg hover:shadow-black/5">
        <div className="flex h-16 shrink-0 items-center border-b border-gray-100 px-[18px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-900">
            TU
          </div>

          <div className="ml-3 whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <p className="text-sm font-medium text-gray-900">Administrasi TU</p>
            <p className="mt-0.5 text-[11px] text-gray-400">Workspace sekolah</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
          {navItems.map((item) => {
            const isActive = item.id === activeDomain;

            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.available}
                title={!item.available ? `${item.label} — belum tersedia` : item.label}
                className={`relative flex h-10 w-full items-center rounded-lg transition-colors ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : item.available
                      ? "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      : "cursor-default text-gray-300"
                }`}
              >
                {isActive && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-gray-900" />
                )}

                <span className="ml-2.5 h-[18px] w-[18px] shrink-0">{item.icon}</span>

                <span
                  className={`ml-3.5 text-[13px] whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
                    isActive ? "font-medium" : "font-normal"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
