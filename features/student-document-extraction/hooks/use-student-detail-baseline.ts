import { useEffect, useRef, useState } from "react";
import { extractStudentNameFromFilename } from "@/lib/documents/document-name";
import { getStudentDetail } from "@/lib/api/students";
import type { ExtractionHistoryItem } from "@/types/extraction-history";
import type { StudentDetailBaseline } from "@/types/student-detail";
import type { StudentRecord } from "@/types/student";

interface Params {
  filesLength: number;
  primarySessionStudent: StudentRecord | null;
  history: ExtractionHistoryItem[];
}

export function useStudentDetailBaseline({
  filesLength,
  primarySessionStudent,
  history,
}: Params) {
  const [studentDetailBaseline, setStudentDetailBaseline] =
    useState<StudentDetailBaseline | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] =
    useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (filesLength === 0 || !primarySessionStudent) return;

    const student = primarySessionStudent;

    if (
      studentDetailBaseline?.rowIndex ===
      student.rowIndex
    ) {
      return;
    }

    const requestId =
      ++requestIdRef.current;

    const studentId =
      extractStudentNameFromFilename(
        `${student.nama}_KK.pdf`
      );

    const localItem =
      history.find(
        (item) => item.id === studentId
      );

    void Promise.resolve().then(async () => {
      if (
        requestIdRef.current !== requestId
      ) {
        return;
      }

      if (localItem) {
        setStudentDetailBaseline({
          rowIndex: student.rowIndex,
          kk: localItem.kk,
          akta: localItem.akta,
          modelUsedKk: localItem.modelUsedKk,
          modelUsedAkta: localItem.modelUsedAkta,
        });

        setLoadingStudentDetail(false);
        return;
      }

      setLoadingStudentDetail(true);

      try {
        const detail =
          await getStudentDetail(
            student.rowIndex
          );

        if (
          requestIdRef.current !==
          requestId
        ) {
          return;
        }

        setStudentDetailBaseline({
          rowIndex: student.rowIndex,
          kk: detail.kk,
          akta: detail.akta,
          modelUsedKk: "",
          modelUsedAkta: "",
        });
      } catch (error) {
        if (
          requestIdRef.current !==
          requestId
        ) {
          return;
        }

        console.error(
          "[Upload Baseline Detail]",
          error
        );

        setStudentDetailBaseline(null);
      } finally {
        if (
          requestIdRef.current ===
          requestId
        ) {
          setLoadingStudentDetail(false);
        }
      }
    });
  }, [
    filesLength,
    primarySessionStudent,
    studentDetailBaseline?.rowIndex,
    history,
  ]);

  const resetStudentDetailBaseline = () => {
    requestIdRef.current += 1;
    setStudentDetailBaseline(null);
    setLoadingStudentDetail(false);
  };

  return {
    studentDetailBaseline,
    setStudentDetailBaseline,
    loadingStudentDetail,
    setLoadingStudentDetail,
    resetStudentDetailBaseline,
  };
}