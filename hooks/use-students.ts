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

async function fetchStudents(): Promise<StudentRecord[]> {
  const response = await fetch("/api/students", { method: "GET", cache: "no-store" });

  const data = (await response.json()) as StudentsApiResponse;

  if (!response.ok || !data.success) {
    throw new Error(!data.success ? data.message : "Gagal mengambil daftar murid.");
  }

  return data.data;
}

export function useStudents(): UseStudentsReturn {
  const [students, setStudents] = useState<StudentRecord[]>([]);

  const [loadingStudents, setLoadingStudents] = useState(true);

  const [studentError, setStudentError] = useState("");

  const applyStudentsLoad = useCallback(async () => {
    try {
      const data = await fetchStudents();

      setStudents(data);
      setStudentError("");
    } catch (error) {
      setStudents([]);
      setStudentError(error instanceof Error ? error.message : "Gagal mengambil daftar murid.");
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    setLoadingStudents(true);
    setStudentError("");

    await applyStudentsLoad();
  }, [applyStudentsLoad]);

  useEffect(() => {
    let active = true;

    void fetchStudents()
      .then((data) => {
        if (!active) return;

        setStudents(data);
        setStudentError("");
      })
      .catch((error: unknown) => {
        if (!active) return;

        setStudents([]);
        setStudentError(error instanceof Error ? error.message : "Gagal mengambil daftar murid.");
      })
      .finally(() => {
        if (!active) return;

        setLoadingStudents(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { students, loadingStudents, studentError, refreshStudents };
}
