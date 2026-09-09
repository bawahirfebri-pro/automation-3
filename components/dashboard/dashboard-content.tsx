import type { ReactNode } from "react";

interface DashboardContentProps {
  children: ReactNode;
}

export default function DashboardContent({ children }: DashboardContentProps) {
  return <div className="grid grid-cols-12 gap-4">{children}</div>;
}
