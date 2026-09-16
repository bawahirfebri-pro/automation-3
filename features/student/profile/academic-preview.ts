import type { AcademicData } from "@/features/student/types/academic";

export const academicPreview: AcademicData = {
  schoolYear: "2026/2027",
  semester: "Ganjil",
  average: 87.4,
  attendance: 96,
  rank: 5,
  studentCount: 32,
  highestScore: 94,
  highestSubject: "Matematika",
  grades: [
    { subject: "B. Indonesia", score: 88 },
    { subject: "Matematika", score: 94 },
    { subject: "IPAS", score: 90 },
    { subject: "PPKn", score: 84 },
    { subject: "B. Inggris", score: 86 },
  ],
};
