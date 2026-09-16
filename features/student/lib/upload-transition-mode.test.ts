import { describe, expect, it } from "vitest";

import { getUploadTransitionMode } from "./upload-transition-mode";

describe("getUploadTransitionMode", () => {
  it("memilih replace-unmatched jika seluruh incoming filename tidak ditemukan", () => {
    expect(
      getUploadTransitionMode({
        allSelectedNotFound: true,
        existingFilesLength: 3,
        canUseFilenameFastPath: true,
      }),
    ).toBe("replace-unmatched");
  });

  it("replace-unmatched memiliki prioritas lebih tinggi daripada initial session", () => {
    expect(
      getUploadTransitionMode({
        allSelectedNotFound: true,
        existingFilesLength: 0,
        canUseFilenameFastPath: false,
      }),
    ).toBe("replace-unmatched");
  });

  it("memilih replace-initial jika belum ada active files", () => {
    expect(
      getUploadTransitionMode({
        allSelectedNotFound: false,
        existingFilesLength: 0,
        canUseFilenameFastPath: false,
      }),
    ).toBe("replace-initial");
  });

  it("memilih merge-fast jika session sudah ada dan filename fast path aman", () => {
    expect(
      getUploadTransitionMode({
        allSelectedNotFound: false,
        existingFilesLength: 2,
        canUseFilenameFastPath: true,
      }),
    ).toBe("merge-fast");
  });

  it("memilih append-pending jika session ada tetapi fast path tidak aman", () => {
    expect(
      getUploadTransitionMode({
        allSelectedNotFound: false,
        existingFilesLength: 2,
        canUseFilenameFastPath: false,
      }),
    ).toBe("append-pending");
  });
});
