import type { StudentRecord } from "@/types/student";

interface StudentCompletenessSource {
  noKk: string;
  noAkta: string;
}

function isKkComplete(data: StudentCompletenessSource): boolean {
  return Boolean(data.noKk?.trim());
}

function isAktaComplete(data: StudentCompletenessSource): boolean {
  return Boolean(data.noAkta?.trim());
}

export function applyStudentCompleteness(
  student: Omit<StudentRecord, "kkComplete" | "aktaComplete">,
): StudentRecord {
  return { ...student, kkComplete: isKkComplete(student), aktaComplete: isAktaComplete(student) };
}
