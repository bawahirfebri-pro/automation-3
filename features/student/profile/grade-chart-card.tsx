import ModuleHeader from "@/features/student/components/module-header";

import type { AcademicData } from "@/features/student/types/academic";

interface GradeChartCardProps {
  data: AcademicData;
}

function GradeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 17 5-5 4 3 7-8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7h4v4" />
    </svg>
  );
}

export default function GradeChartCard({ data }: GradeChartCardProps) {
  const chartWidth = 720;
  const chartTop = 14;
  const chartBottom = 94;
  const chartMinScore = 75;
  const chartMaxScore = 100;

  const gradePoints = data.grades.map((grade, index) => {
    const x =
      data.grades.length === 1
        ? chartWidth / 2
        : 18 + (index * (chartWidth - 36)) / (data.grades.length - 1);

    const normalizedScore = (grade.score - chartMinScore) / (chartMaxScore - chartMinScore);

    return {
      ...grade,
      x,
      y: chartBottom - Math.max(0, Math.min(1, normalizedScore)) * (chartBottom - chartTop),
    };
  });

  const chartLinePoints = gradePoints.map((point) => `${point.x},${point.y}`).join(" ");

  const averageY =
    chartBottom -
    ((data.average - chartMinScore) / (chartMaxScore - chartMinScore)) * (chartBottom - chartTop);

  return (
    <section className="flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <ModuleHeader
        icon={<GradeIcon />}
        title="Nilai Semester"
        description="Performa tiap mata pelajaran pada semester aktif."
        trailing={
          <span className="text-[10.5px] leading-4 whitespace-nowrap text-gray-400">
            {data.semester} · {data.schoolYear}
          </span>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col justify-center px-4">
        <svg
          viewBox={`0 0 ${chartWidth} 110`}
          preserveAspectRatio="none"
          className="h-[108px] w-full overflow-visible"
          aria-label="Grafik nilai mata pelajaran"
        >
          {[80, 90, 100].map((value) => {
            const y =
              chartBottom -
              ((value - chartMinScore) / (chartMaxScore - chartMinScore)) *
                (chartBottom - chartTop);

            return (
              <line
                key={value}
                x1="0"
                x2={chartWidth}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.05"
                strokeWidth="1"
              />
            );
          })}

          <line
            x1="0"
            x2={chartWidth}
            y1={averageY}
            y2={averageY}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="1"
            strokeDasharray="4 5"
          />

          <polyline
            points={chartLinePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-900"
            vectorEffect="non-scaling-stroke"
          />

          {gradePoints.map((point) => {
            const isHighest = point.score === data.highestScore;

            return (
              <g key={point.subject}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHighest ? 3.8 : 2.8}
                  fill="white"
                  stroke="currentColor"
                  strokeWidth={isHighest ? 2.4 : 1.8}
                  className="text-gray-900"
                  vectorEffect="non-scaling-stroke"
                />

                {isHighest ? (
                  <text
                    x={point.x}
                    y={point.y - 8}
                    textAnchor="middle"
                    className="fill-gray-800 text-[9.5px] font-semibold"
                  >
                    {point.score}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${data.grades.length}, minmax(0, 1fr))` }}
        >
          {data.grades.map((grade) => (
            <div key={grade.subject} className="min-w-0 px-1 text-center">
              <p className="truncate text-[10.5px] leading-4 text-gray-500">{grade.subject}</p>
              <p className="text-[9.5px] leading-4 text-gray-400">{grade.score}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
