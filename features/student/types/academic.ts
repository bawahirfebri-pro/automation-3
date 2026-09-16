export interface AcademicGrade {
  subject: string;
  score: number;
}

export interface AcademicData {
  schoolYear: string;
  semester: string;
  average: number;
  attendance: number;
  rank: number;
  studentCount: number;
  highestScore: number;
  highestSubject: string;
  grades: AcademicGrade[];
}
