import type { ReactNode } from "react";

import type { DashboardDomain } from "@/components/dashboard/dashboard-sidebar";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  activeDomain: DashboardDomain;
  rightSidebar?: ReactNode;
}

export default function DashboardLayout({
  children,
  activeDomain,
  rightSidebar,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      <DashboardSidebar activeDomain={activeDomain} />

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">{children}</main>

      {rightSidebar}
    </div>
  );
}
