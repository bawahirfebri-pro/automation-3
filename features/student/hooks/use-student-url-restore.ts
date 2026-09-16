import { useEffect, useRef } from "react";

import { getNikFromPathname } from "@/lib/students/student-url";

import type { StudentRecord } from "@/types/student";

interface Params {
  loadingStudents: boolean;
  students: StudentRecord[];
  onSelectStudent: (student: StudentRecord) => void | Promise<unknown>;
}

export function useStudentUrlRestore({ loadingStudents, students, onSelectStudent }: Params) {
  const restoredNikRef = useRef("");
  const onSelectStudentRef = useRef(onSelectStudent);

  useEffect(() => {
    onSelectStudentRef.current = onSelectStudent;
  }, [onSelectStudent]);

  useEffect(() => {
    if (loadingStudents || students.length === 0) {
      return;
    }

    const nikFromUrl = getNikFromPathname(window.location.pathname);

    if (!nikFromUrl) {
      return;
    }

    if (restoredNikRef.current === nikFromUrl) {
      return;
    }

    const student = students.find((item) => item.nik.replace(/\D/g, "") === nikFromUrl);

    if (!student) {
      console.warn("[STUDENT URL] NIK tidak ditemukan:", nikFromUrl);

      restoredNikRef.current = nikFromUrl;

      return;
    }

    restoredNikRef.current = nikFromUrl;

    void Promise.resolve().then(() => onSelectStudentRef.current(student));
  }, [loadingStudents, students]);
}
