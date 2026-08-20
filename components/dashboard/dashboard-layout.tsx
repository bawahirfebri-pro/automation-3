import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block" />

      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}