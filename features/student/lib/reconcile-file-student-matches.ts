import {
  createFileStudentMatch,
  type FileStudentMatch,
  matchFileStudentLocally,
} from "@/lib/students/file-student-matcher";

type FileMatchPlan = ReturnType<typeof matchFileStudentLocally>;

interface Params {
  previous: Record<string, FileStudentMatch>;
  currentFileKeys: string[];
  fileMatchPlans: Record<string, FileMatchPlan>;
}

export function reconcileFileStudentMatches({
  previous,
  currentFileKeys,
  fileMatchPlans,
}: Params): Record<string, FileStudentMatch> {
  const currentFileKeySet = new Set(currentFileKeys);

  const next: Record<string, FileStudentMatch> = {};

  currentFileKeys.forEach((fileKey) => {
    const previousMatch = previous[fileKey];

    if (previousMatch) {
      next[fileKey] = previousMatch;
    }
  });

  Object.entries(fileMatchPlans).forEach(([fileKey, plan]) => {
    if (!currentFileKeySet.has(fileKey)) {
      return;
    }

    const previousMatch = previous[fileKey];

    const previousRows = previousMatch?.rowIndexes ?? [];

    if (
      previousMatch?.source === "exact" ||
      previousMatch?.source === "ai" ||
      previousMatch?.source === "manual"
    ) {
      next[fileKey] = createFileStudentMatch(
        [...plan.match.rowIndexes, ...previousRows],
        previousMatch.source,
      );

      return;
    }

    next[fileKey] = plan.match;
  });

  return next;
}
