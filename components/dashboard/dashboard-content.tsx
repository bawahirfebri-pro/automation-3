import type { ReactNode } from "react";

interface DashboardContentProps {
  children: ReactNode;
}

export default function DashboardContent({
  children,
}: DashboardContentProps) {
  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-6">
      {children}
    </div>
  );
}