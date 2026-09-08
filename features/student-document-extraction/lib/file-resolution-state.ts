import { matchFileStudentLocally, type FileStudentMatch } from "@/lib/students/file-student-matcher";
import type { FileExtractionState } from "@/types/extraction";
import type { ManualResolutionTask, ManualResolutionValue } from "@/types/manual-resolution";

type FileMatchPlan = ReturnType<typeof matchFileStudentLocally>;
type AiTaskOutcome = { status: "matched" | "rejected" | "failed"; payloadKey: string };

interface Params {
  aiMatchingTaskKeys: string[];
  currentFileKeys: string[];
  fileMatchPlans: Record<string, FileMatchPlan>;
  aiTaskOutcomes: Record<string, AiTaskOutcome>;
  fileStudentMatches: Record<string, FileStudentMatch>;
  fileExtractions: Record<string, FileExtractionState>;
  manualTaskResolutions: Record<string, ManualResolutionValue>;
}

export function getFileResolutionState({
  aiMatchingTaskKeys,
  currentFileKeys,
  fileMatchPlans,
  aiTaskOutcomes,
  fileStudentMatches,
  fileExtractions,
  manualTaskResolutions,
}: Params) {
  const aiMatchingFileKeys = [...new Set(aiMatchingTaskKeys.map((taskKey) => taskKey.split("::")[0]))];
  const isAiMatching = aiMatchingTaskKeys.length > 0;

  const manualTasksByFile = Object.fromEntries(currentFileKeys.map((fileKey) => {
    const plan = fileMatchPlans[fileKey];
    if (!plan) return [fileKey, []];

    const tasks: ManualResolutionTask[] = plan.manualTasks.map((task) => ({
      taskKey: task.taskKey,
      detectedName: task.detectedName,
      reason: "duplicate-name",
      candidates: task.candidates,
    }));

    plan.pendingAi?.tasks.forEach((task) => {
      const requestKey = `${fileKey}::${task.taskKey}`;
      const payloadKey = JSON.stringify({ detectedNames: task.detectedNames, candidates: task.candidates });
      const outcome = aiTaskOutcomes[requestKey];
      if (outcome?.payloadKey !== payloadKey || (outcome.status !== "rejected" && outcome.status !== "failed")) return;

      tasks.push({
        taskKey: task.taskKey,
        detectedName: task.detectedNames[0] || "Nama tidak diketahui",
        reason: "ai-ambiguous",
        candidates: task.candidates,
      });
    });

    return [fileKey, tasks];
  })) as Record<string, ManualResolutionTask[]>;

  const fileResolutionComplete = Object.fromEntries(currentFileKeys.map((fileKey) => {
    const plan = fileMatchPlans[fileKey];
    const currentMatch = fileStudentMatches[fileKey];
    const trustedFilenameMatch = currentMatch?.source === "exact" && currentMatch.rowIndexes.length > 0;

    if (trustedFilenameMatch && Boolean(fileExtractions[fileKey]) && !aiMatchingFileKeys.includes(fileKey)) return [fileKey, true];
    if (!plan || plan.resolution.totalCandidates === 0) return [fileKey, false];

    let accounted = plan.resolution.locallyMatched + plan.resolution.locallyNotEnrolled;

    plan.manualTasks.forEach((task) => {
      if (manualTaskResolutions[`${fileKey}::${task.taskKey}`]) accounted += 1;
    });

    plan.pendingAi?.tasks.forEach((task) => {
      const requestKey = `${fileKey}::${task.taskKey}`;

      if (manualTaskResolutions[requestKey]) {
        accounted += 1;
        return;
      }

      const payloadKey = JSON.stringify({ detectedNames: task.detectedNames, candidates: task.candidates });
      const outcome = aiTaskOutcomes[requestKey];
      if (outcome?.payloadKey === payloadKey && outcome.status === "matched") accounted += 1;
    });

    return [fileKey, !aiMatchingFileKeys.includes(fileKey) && accounted >= plan.resolution.totalCandidates];
  })) as Record<string, boolean>;

  return { aiMatchingFileKeys, isAiMatching, manualTasksByFile, fileResolutionComplete };
}