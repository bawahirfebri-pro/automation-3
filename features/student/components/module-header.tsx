import type { ReactNode } from "react";

interface ModuleHeaderProps {
  icon: ReactNode;
  title: string;
  description?: string;
  trailing?: ReactNode;
  withBorder?: boolean;
}

export default function ModuleHeader({
  icon,
  title,
  description,
  trailing,
  withBorder = false,
}: ModuleHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 px-4 py-3.5 ${
        withBorder ? "border-b border-gray-100" : ""
      }`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="text-[13.5px] leading-5 font-semibold text-gray-900">{title}</h3>

          {description ? (
            <p className="mt-0.5 text-[10.5px] leading-4 text-gray-500">{description}</p>
          ) : null}
        </div>
      </div>

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
