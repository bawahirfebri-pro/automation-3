import type { ReactNode } from "react";

import DashboardHeader from "@/components/dashboard/dashboard-header";
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

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader />

        <div className="flex min-h-0 flex-1">
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>

          {rightSidebar}
        </div>
      </div>
    </div>
  );
}
