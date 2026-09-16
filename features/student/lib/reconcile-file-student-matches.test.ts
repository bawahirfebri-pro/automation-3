import { describe, expect, it } from "vitest";

import {
  createFileStudentMatch,
  matchFileStudentLocally,
} from "@/lib/students/file-student-matcher";

import type { FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

import { reconcileFileStudentMatches } from "./reconcile-file-student-matches";

const students: StudentRecord[] = [];

function createPlan() {
  return matchFileStudentLocally({} as FileExtractionState, students);
}

describe("reconcileFileStudentMatches", () => {
  it("membuang match dari file yang sudah tidak aktif", () => {
    const result = reconcileFileStudentMatches({
      previous: {
        active: createFileStudentMatch([10], "exact"),
        stale: createFileStudentMatch([20], "exact"),
      },
      currentFileKeys: ["active"],
      fileMatchPlans: {},
    });

    expect(result.active?.rowIndexes).toEqual([10]);

    expect(result.stale).toBeUndefined();
  });

  it("mempertahankan previous match untuk active file tanpa plan baru", () => {
    const result = reconcileFileStudentMatches({
      previous: { file: createFileStudentMatch([10], "manual") },
      currentFileKeys: ["file"],
      fileMatchPlans: {},
    });

    expect(result.file).toEqual(createFileStudentMatch([10], "manual"));
  });

  it("menggabungkan local rows dengan previous manual rows", () => {
    const plan = createPlan();

    plan.match = createFileStudentMatch([10], "fuzzy");

    const result = reconcileFileStudentMatches({
      previous: { file: createFileStudentMatch([20], "manual") },
      currentFileKeys: ["file"],
      fileMatchPlans: { file: plan },
    });

    expect(result.file?.rowIndexes).toEqual([10, 20]);

    expect(result.file?.source).toBe("manual");
  });

  it("menggunakan local plan jika tidak ada protected previous source", () => {
    const plan = createPlan();

    plan.match = createFileStudentMatch([10], "fuzzy");

    const result = reconcileFileStudentMatches({
      previous: {},
      currentFileKeys: ["file"],
      fileMatchPlans: { file: plan },
    });

    expect(result.file).toEqual(plan.match);
  });
});
