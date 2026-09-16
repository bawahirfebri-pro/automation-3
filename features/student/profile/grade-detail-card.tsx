import ModuleHeader from "@/features/student/components/module-header";

import type { AcademicData } from "@/features/student/types/academic";

interface GradeDetailCardProps {
  data: AcademicData;
}

function GradeDetailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5.5h12M6 10h12M6 14.5h7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m16 17 1.5 1.5L20.5 15" />
    </svg>
  );
}

export default function GradeDetailCard({ data }: GradeDetailCardProps) {
  return (
    <section className="flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <ModuleHeader
        icon={<GradeDetailIcon />}
        title="Detail Nilai"
        description="Nilai tiap mata pelajaran semester aktif."
        withBorder
      />

      <div className="flex-1">
        <div className="divide-y divide-gray-100">
          {data.grades.map((grade) => (
            <div
              key={grade.subject}
              className="flex min-h-[31px] items-center justify-between gap-3 px-4"
            >
              <span className="min-w-0 truncate text-[10.5px] font-medium text-gray-600">
                {grade.subject}
              </span>

              <span className="shrink-0 text-[11px] font-semibold text-gray-900 tabular-nums">
                {grade.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5">
        <span className="text-[9.5px] text-gray-400">{data.grades.length} mata pelajaran</span>

        <span className="text-[9.5px] text-gray-400">
          {data.semester} · {data.schoolYear}
        </span>
      </div>
    </section>
  );
}
