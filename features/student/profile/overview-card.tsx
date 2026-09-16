import ModuleHeader from "@/features/student/components/module-header";

import type { AcademicData } from "@/features/student/types/academic";

interface OverviewCardProps {
  data: AcademicData;
}

function OverviewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
    </svg>
  );
}

export default function OverviewCard({ data }: OverviewCardProps) {
  return (
    <section className="flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <ModuleHeader
        icon={<OverviewIcon />}
        title="Overview"
        description="Ringkasan performa akademik siswa."
        trailing={
          <span className="text-[10px] leading-4 whitespace-nowrap text-gray-400">
            {data.schoolYear} · {data.semester}
          </span>
        }
      />

      <div className="grid flex-1 grid-cols-3 content-center gap-3 px-4">
        <div>
          <p className="text-[22px] leading-none font-semibold tracking-[-0.035em] text-gray-950">
            {data.average}
          </p>
          <p className="mt-1.5 text-[10.5px] leading-4 text-gray-500">Rata-rata</p>
        </div>

        <div>
          <p className="text-[22px] leading-none font-semibold tracking-[-0.035em] text-gray-950">
            {data.attendance}
            <span className="ml-0.5 text-[11px] font-medium text-gray-400">%</span>
          </p>
          <p className="mt-1.5 text-[10.5px] leading-4 text-gray-500">Kehadiran</p>
        </div>

        <div>
          <p className="text-[22px] leading-none font-semibold tracking-[-0.035em] text-gray-950">
            #{data.rank}
            <span className="ml-1 text-[11px] font-medium text-gray-400">
              / {data.studentCount}
            </span>
          </p>
          <p className="mt-1.5 text-[10.5px] leading-4 text-gray-500">Ranking</p>
        </div>
      </div>

      <div className="flex h-[38px] items-center gap-2 border-t border-gray-100 px-4 text-[10.5px]">
        <span className="text-gray-400">Tertinggi</span>
        <span className="font-medium text-gray-700">{data.highestSubject}</span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-gray-900">{data.highestScore}</span>
      </div>
    </section>
  );
}
