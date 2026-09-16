export type UploadTransitionMode =
  "replace-unmatched" | "replace-initial" | "merge-fast" | "append-pending";

interface Params {
  allSelectedNotFound: boolean;
  existingFilesLength: number;
  canUseFilenameFastPath: boolean;
}

export function getUploadTransitionMode({
  allSelectedNotFound,
  existingFilesLength,
  canUseFilenameFastPath,
}: Params): UploadTransitionMode {
  if (allSelectedNotFound) {
    return "replace-unmatched";
  }

  if (existingFilesLength === 0) {
    return "replace-initial";
  }

  if (canUseFilenameFastPath) {
    return "merge-fast";
  }

  return "append-pending";
}
