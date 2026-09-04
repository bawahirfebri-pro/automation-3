import type { FileExtractionState } from "@/hooks/use-document-extraction";
import type { StudentRecord } from "@/types/student";

import {
  findExactStudentMatch,
  findFuzzyStudentMatch,
  getFuzzyStudentCandidates,
  normalizeStudentName,
  type StudentNameCandidate,
} from "@/lib/student-matcher";
import {
  getEligibleKkStudents,
  getKkStudentEligibility,
} from "@/lib/kk-student-eligibility";

export type FileStudentMatchSource =
  | "exact"
  | "fuzzy"
  | "ai"
  | "manual"
  | "filename"
  | "unmatched";

export interface FileStudentMatch {
  rowIndex: number | null;
  rowIndexes: number[];
  source: FileStudentMatchSource;
}

export interface StudentMatchCandidateRow {
  rowIndex: number;
  nama: string;
  score: number;
}

export interface PendingAiCandidateTask {
  taskKey: string;
  detectedNames: string[];
  candidates: StudentMatchCandidateRow[];
}

export interface ManualCandidateTask {
  taskKey: string;
  detectedName: string;
  candidates: StudentMatchCandidateRow[];
  reason: "duplicate-name";
}

export interface PendingAiFileMatch {
  tasks: PendingAiCandidateTask[];
}

export interface FileResolutionState {
  totalCandidates: number;
  locallyMatched: number;
  locallyNotEnrolled: number;
  pendingAiTasks: number;
  manualRequiredTasks: number;
}

export interface LocalFileStudentMatchResult {
  match: FileStudentMatch;
  pendingAi: PendingAiFileMatch | null;
  manualTasks: ManualCandidateTask[];
  resolution: FileResolutionState;
}

export function createFileStudentMatch(
  rowIndexes: number[],
  source: FileStudentMatchSource
): FileStudentMatch {
  const uniqueRowIndexes = [
    ...new Set(rowIndexes.filter((rowIndex) => Number.isInteger(rowIndex))),
  ];

  return {
    rowIndex: uniqueRowIndexes[0] ?? null,
    rowIndexes: uniqueRowIndexes,
    source,
  };
}

export function createUnmatchedFileStudentMatch(): FileStudentMatch {
  return { rowIndex: null, rowIndexes: [], source: "unmatched" };
}

function createResolution(
  totalCandidates: number,
  locallyMatched: number,
  locallyNotEnrolled: number,
  pendingAiTasks: number,
  manualRequiredTasks: number
): FileResolutionState {
  return {
    totalCandidates,
    locallyMatched,
    locallyNotEnrolled,
    pendingAiTasks,
    manualRequiredTasks,
  };
}

function createStudentNameCandidate(
  name: string,
  source: StudentNameCandidate["source"]
): StudentNameCandidate {
  return {
    name,
    normalizedName: normalizeStudentName(name),
    source,
  };
}

function getUniqueCandidates(
  candidates: StudentNameCandidate[]
): StudentNameCandidate[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const normalized =
      candidate.normalizedName || normalizeStudentName(candidate.name);

    if (!normalized || seen.has(normalized)) return false;

    seen.add(normalized);
    return true;
  });
}

function getEditDistance(a: string, b: string): number {
  const previous = Array.from(
    { length: b.length + 1 },
    (_, index) => index
  );

  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j];

      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );

      diagonal = old;
    }
  }

  return previous[b.length];
}

function isSimpleNameTypo(
  detectedName: string,
  studentName: string
): boolean {
  const detectedWords =
    normalizeStudentName(detectedName)
      .split(" ")
      .filter(Boolean);

  const studentWords =
    normalizeStudentName(studentName)
      .split(" ")
      .filter(Boolean);

  if (
    detectedWords.length === 0 ||
    detectedWords.length !== studentWords.length
  ) {
    return false;
  }

  let changedWords = 0;
  let totalEdits = 0;

  for (
    let index = 0;
    index < detectedWords.length;
    index += 1
  ) {
    const detectedWord = detectedWords[index];
    const studentWord = studentWords[index];

    if (detectedWord === studentWord) {
      continue;
    }

    const distance = getEditDistance(
      detectedWord,
      studentWord
    );

    const longestLength = Math.max(
      detectedWord.length,
      studentWord.length
    );

    const maxWordEdits =
      longestLength >= 8 ? 2 : 1;

    if (distance > maxWordEdits) {
      return false;
    }

    changedWords += 1;
    totalEdits += distance;
  }

  return (
    changedWords <= 2 &&
    totalEdits <= 2
  );
}

function debugKkMembers(extraction: FileExtractionState): void {
  if (!extraction.kk) return;

  console.group("[KK MATCH DEBUG]");

  console.log(
    "[1] ALL MEMBERS",
    extraction.kk.anggota_keluarga.map((anggota) => ({
      nama: anggota.nama_lengkap,
      tanggalLahir: anggota.tanggal_lahir,
      status: anggota.status_hubungan_dalam_keluarga,
      eligibility: getKkStudentEligibility(anggota),
    }))
  );

  console.log(
    "[2] ELIGIBLE MEMBERS",
    getEligibleKkStudents(extraction.kk.anggota_keluarga).map((anggota) => ({
      nama: anggota.nama_lengkap,
      tanggalLahir: anggota.tanggal_lahir,
      status: anggota.status_hubungan_dalam_keluarga,
    }))
  );

  console.groupEnd();
}

function getKkStudentCandidates(
  extraction: FileExtractionState
): StudentNameCandidate[] {
  if (!extraction.kk) return [];

  const candidates = getUniqueCandidates(
    getEligibleKkStudents(extraction.kk.anggota_keluarga).map((anggota) =>
      createStudentNameCandidate(anggota.nama_lengkap, "kk")
    )
  );

  console.log(
    "[KK MATCH DEBUG] [3] NAME CANDIDATES",
    candidates.map((candidate) => ({
      name: candidate.name,
      normalizedName: candidate.normalizedName,
    }))
  );

  return candidates;
}

function findExactRowsForCandidate(
  candidate: StudentNameCandidate,
  students: StudentRecord[]
): number[] {
  const normalized =
    candidate.normalizedName || normalizeStudentName(candidate.name);

  const rows = students
    .filter((student) => normalizeStudentName(student.nama) === normalized)
    .map((student) => student.rowIndex);

  console.log(`[KK MATCH DEBUG] EXACT "${candidate.name}"`, {
    normalized,
    rows,
  });

  return rows;
}

function createCandidateRows(
  rows: number[],
  fallbackName: string,
  students: StudentRecord[]
): StudentMatchCandidateRow[] {
  return rows.map((rowIndex) => {
    const student = students.find((item) => item.rowIndex === rowIndex);

    return {
      rowIndex,
      nama: student?.nama || fallbackName,
      score: 1,
    };
  });
}

function createAiTask(
  candidate: StudentNameCandidate,
  students: StudentRecord[],
  excludedRows: Set<number>
): PendingAiCandidateTask | null {
  const fuzzyCandidates =
  getFuzzyStudentCandidates(
    [candidate],
    students,
    5
  )
    .filter(
      ({ student }) =>
        !excludedRows.has(
          student.rowIndex
        )
    )
    .filter(
      ({ student }) =>
        isSimpleNameTypo(
          candidate.name,
          student.nama
        )
    );

  console.log(
    `[KK MATCH DEBUG] AI CANDIDATES "${candidate.name}"`,
    fuzzyCandidates.map(({ student, score }) => ({
      rowIndex: student.rowIndex,
      nama: student.nama,
      score,
    }))
  );

  if (fuzzyCandidates.length === 0) return null;

  const normalized =
    candidate.normalizedName || normalizeStudentName(candidate.name);

  return {
    taskKey: normalized || candidate.name,
    detectedNames: [candidate.name],
    candidates: fuzzyCandidates.map(({ student, score }) => ({
      rowIndex: student.rowIndex,
      nama: student.nama,
      score,
    })),
  };
}

function matchKkStudentsLocally(
  extraction: FileExtractionState,
  students: StudentRecord[]
): LocalFileStudentMatchResult {
  debugKkMembers(extraction);

  const candidates = getKkStudentCandidates(extraction);

  console.log(
    "[KK MATCH DEBUG] [4] STUDENTS FROM SHEET",
    students.map((student) => ({
      rowIndex: student.rowIndex,
      nama: student.nama,
      normalized: normalizeStudentName(student.nama),
    }))
  );

  if (candidates.length === 0) {
    console.warn(
      "[KK MATCH DEBUG] Tidak ada kandidat anggota KK yang eligible."
    );

    return {
      match: createUnmatchedFileStudentMatch(),
      pendingAi: null,
      manualTasks: [],
      resolution: createResolution(0, 0, 0, 0, 0),
    };
  }

  const exactRows: number[] = [];
  const fuzzyRows: number[] = [];
  const claimedRows = new Set<number>();
  const aiTasks: PendingAiCandidateTask[] = [];
  const manualTasks: ManualCandidateTask[] = [];

  let locallyMatched = 0;
  let locallyNotEnrolled = 0;

  for (const candidate of candidates) {
    console.group(`[KK MATCH DEBUG] PROCESS "${candidate.name}"`);

    const normalized =
      candidate.normalizedName || normalizeStudentName(candidate.name);

    const exactRowsForCandidate = findExactRowsForCandidate(
      candidate,
      students
    );

    if (exactRowsForCandidate.length === 1) {
      const rowIndex = exactRowsForCandidate[0];

      if (!claimedRows.has(rowIndex)) {
        claimedRows.add(rowIndex);
        exactRows.push(rowIndex);
        locallyMatched += 1;

        console.log("RESULT: EXACT MATCH", {
          rowIndex,
          candidate: candidate.name,
        });
      } else {
        console.warn("RESULT: ROW SUDAH DIKLAIM ANGGOTA LAIN", {
          rowIndex,
          candidate: candidate.name,
        });
      }

      console.groupEnd();
      continue;
    }

    if (exactRowsForCandidate.length > 1) {
      console.warn(
        "RESULT: DUPLICATE EXACT NAME",
        exactRowsForCandidate
      );

      manualTasks.push({
        taskKey: `duplicate:${normalized}`,
        detectedName: candidate.name,
        reason: "duplicate-name",
        candidates: createCandidateRows(
          exactRowsForCandidate,
          candidate.name,
          students
        ),
      });

      console.groupEnd();
      continue;
    }

    const fuzzy =
  findFuzzyStudentMatch(
    [candidate],
    students
  );

const simpleTypoMatch =
  fuzzy &&
  isSimpleNameTypo(
    candidate.name,
    fuzzy.student.nama
  );

if (
  fuzzy &&
  simpleTypoMatch &&
  !claimedRows.has(
    fuzzy.student.rowIndex
  )
) {
  claimedRows.add(
    fuzzy.student.rowIndex
  );

  fuzzyRows.push(
    fuzzy.student.rowIndex
  );

  locallyMatched += 1;
  continue;
}

    const aiTask = createAiTask(candidate, students, claimedRows);

    if (aiTask) {
      aiTasks.push(aiTask);

      console.log("RESULT: PENDING AI", {
        candidate: candidate.name,
        taskKey: aiTask.taskKey,
        candidates: aiTask.candidates,
      });

      console.groupEnd();
      continue;
    }

    locallyNotEnrolled += 1;

    console.warn(
      "RESULT: NOT ENROLLED / NO MATCH",
      candidate.name
    );

    console.groupEnd();
  }

  const rowIndexes = [
    ...new Set([
      ...exactRows,
      ...fuzzyRows,
    ]),
  ];

  let source: FileStudentMatchSource = "unmatched";

  if (fuzzyRows.length > 0) source = "fuzzy";
  else if (exactRows.length > 0) source = "exact";

  console.log("[KK MATCH DEBUG] [5] FINAL LOCAL RESULT", {
    exactRows,
    fuzzyRows,
    rowIndexes,
    locallyMatched,
    locallyNotEnrolled,
    aiTasks: aiTasks.map((task) => ({
      taskKey: task.taskKey,
      detectedNames: task.detectedNames,
    })),
    manualTasks: manualTasks.map((task) => ({
      taskKey: task.taskKey,
      detectedName: task.detectedName,
    })),
  });

  return {
    match:
      rowIndexes.length > 0
        ? createFileStudentMatch(rowIndexes, source)
        : createUnmatchedFileStudentMatch(),
    pendingAi: aiTasks.length > 0 ? { tasks: aiTasks } : null,
    manualTasks,
    resolution: createResolution(
      candidates.length,
      locallyMatched,
      locallyNotEnrolled,
      aiTasks.length,
      manualTasks.length
    ),
  };
}

function getAktaCandidates(
  extraction: FileExtractionState
): StudentNameCandidate[] {
  const nama = extraction.akta?.nama_anak?.trim();

  if (!nama) return [];

  return [createStudentNameCandidate(nama, "akta")];
}

function matchAktaStudentLocally(
  extraction: FileExtractionState,
  students: StudentRecord[]
): LocalFileStudentMatchResult {
  const candidates = getUniqueCandidates(
    getAktaCandidates(extraction)
  );

  if (candidates.length === 0) {
    return {
      match: createUnmatchedFileStudentMatch(),
      pendingAi: null,
      manualTasks: [],
      resolution: createResolution(0, 0, 0, 0, 0),
    };
  }

  const candidate = candidates[0];
  const exact = findExactStudentMatch(candidates, students);

  if (exact) {
    const normalized = normalizeStudentName(exact.candidate.name);

    const exactRows = students
      .filter(
        (student) =>
          normalizeStudentName(student.nama) === normalized
      )
      .map((student) => student.rowIndex);

    if (exactRows.length === 1) {
      return {
        match: createFileStudentMatch([exactRows[0]], "exact"),
        pendingAi: null,
        manualTasks: [],
        resolution: createResolution(1, 1, 0, 0, 0),
      };
    }

    if (exactRows.length > 1) {
      return {
        match: createUnmatchedFileStudentMatch(),
        pendingAi: null,
        manualTasks: [
          {
            taskKey: `duplicate:${normalized}`,
            detectedName: exact.candidate.name,
            reason: "duplicate-name",
            candidates: createCandidateRows(
              exactRows,
              exact.candidate.name,
              students
            ),
          },
        ],
        resolution: createResolution(1, 0, 0, 0, 1),
      };
    }
  }

  const fuzzy = findFuzzyStudentMatch(candidates, students);

  if (
  fuzzy &&
  isSimpleNameTypo(
    candidate.name,
    fuzzy.student.nama
  )
) {
  return {
    match:
      createFileStudentMatch(
        [fuzzy.student.rowIndex],
        "fuzzy"
      ),
    pendingAi: null,
    manualTasks: [],
    resolution:
      createResolution(
        1,
        1,
        0,
        0,
        0
      ),
  };
}

  const aiTask = createAiTask(
    candidate,
    students,
    new Set<number>()
  );

  return {
    match: createUnmatchedFileStudentMatch(),
    pendingAi: aiTask ? { tasks: [aiTask] } : null,
    manualTasks: [],
    resolution: createResolution(
      1,
      0,
      aiTask ? 0 : 1,
      aiTask ? 1 : 0,
      0
    ),
  };
}

export function matchFileStudentLocally(
  extraction: FileExtractionState,
  students: StudentRecord[]
): LocalFileStudentMatchResult {
  if (extraction.kk) {
    return matchKkStudentsLocally(extraction, students);
  }

  if (extraction.akta) {
    return matchAktaStudentLocally(extraction, students);
  }

  return {
    match: createUnmatchedFileStudentMatch(),
    pendingAi: null,
    manualTasks: [],
    resolution: createResolution(0, 0, 0, 0, 0),
  };
}