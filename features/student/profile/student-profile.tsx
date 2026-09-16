import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import type { StudentRecord } from "@/types/student";

import { academicPreview } from "@/features/student/profile/academic-preview";
import FamilyMembersCard from "@/features/student/profile/family-members-card";
import GradeChartCard from "@/features/student/profile/grade-chart-card";
import GradeDetailCard from "@/features/student/profile/grade-detail-card";
import KkAddressCard from "@/features/student/profile/kk-address-card";
import OverviewCard from "@/features/student/profile/overview-card";
import ProfileCard from "@/features/student/profile/profile-card";

interface StudentProfileProps {
  student: StudentRecord | null;
  kk: KkResult | null;
  akta: AktaResult | null;
  modelUsedKk: string;
  isLoading: boolean;
  isAiMatching: boolean;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export default function StudentProfile({
  student,
  kk,
  akta,
  modelUsedKk,
  isLoading,
  isAiMatching,
  canSave,
  isSaving,
  onSave,
}: StudentProfileProps) {
  if (isLoading) {
    return (
      <div className="col-span-12 flex min-h-32 items-center justify-center text-[12px] text-gray-400">
        Memuat data murid...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="col-span-12 flex min-h-32 items-center justify-center text-[12px] text-gray-400">
        Pilih murid dari daftar di sebelah kanan.
      </div>
    );
  }

  return (
    <div className="col-span-12 w-full">
      <div className="grid grid-cols-1 items-start gap-2 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="self-start">
          <ProfileCard
            student={student}
            kk={kk}
            akta={akta}
            canSave={canSave}
            isSaving={isSaving}
            onSave={onSave}
          />
        </aside>

        <main className="min-w-0 space-y-2">
          <div className="grid grid-cols-1 items-stretch gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <OverviewCard data={academicPreview} />

            <div className="min-w-0 [&>section]:h-full [&>section>div]:h-full">
              <KkAddressCard data={kk} modelUsed={modelUsedKk} isLoading={isLoading} />
            </div>
          </div>
          <FamilyMembersCard data={kk} studentName={student.nama} isLoading={isLoading} />

          <div className="grid grid-cols-1 items-stretch gap-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <GradeChartCard data={academicPreview} />
            <GradeDetailCard data={academicPreview} />
          </div>

          {isAiMatching ? (
            <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-lg border border-gray-200/80 bg-white/95 px-3 py-2 text-[10px] text-gray-500 shadow-[0_2px_8px_rgba(0,0,0,0.05)] backdrop-blur-sm">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
              Mencocokkan nama murid...
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
