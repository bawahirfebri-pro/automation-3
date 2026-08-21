import type { ReactNode } from "react";

interface DashboardContentProps {
  children: ReactNode;
}

export default function DashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-12 gap-4 lg:gap-5">
      {children}
    </div>
  );
}