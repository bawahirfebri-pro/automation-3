"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudentRecord } from "@/types/student";

interface StudentsApiSuccess {
  success: true;
  data: StudentRecord[];
}

interface StudentsApiError {
  success: false;
  message: string;
}

type StudentsApiResponse = StudentsApiSuccess | StudentsApiError;

interface UseStudentsReturn {
  students: StudentRecord[];
  loadingStudents: boolean;
  studentError: string;
  refreshStudents: () => Promise<void>;
}

export function useStudents(): UseStudentsReturn {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentError, setStudentError] = useState("");

  const refreshStudents = useCallback(async () => {
    setLoadingStudents(true);
    setStudentError("");

    try {
      const response = await fetch("/api/students", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as StudentsApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          !data.success
            ? data.message
            : "Gagal mengambil daftar murid."
        );
      }

      setStudents(data.data);
    } catch (error) {
      setStudents([]);
      setStudentError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar murid."
      );
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    void refreshStudents();
  }, [refreshStudents]);

  return {
    students,
    loadingStudents,
    studentError,
    refreshStudents,
  };
}