export interface ManualResolutionCandidate {
  rowIndex: number;
  nama: string;
  score: number;
}

export interface ManualResolutionTask {
  taskKey: string;
  detectedName: string;
  reason: "duplicate-name" | "ai-ambiguous";
  candidates: ManualResolutionCandidate[];
}

export type ManualResolutionValue =
  { status: "matched"; rowIndex: number } | { status: "not-enrolled"; rowIndex: null };
