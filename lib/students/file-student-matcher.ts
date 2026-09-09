import { getEligibleKkStudents } from "@/lib/students/kk-student-eligibility";
import {
  findExactStudentMatch,
  findFuzzyStudentMatch,
  getFuzzyStudentCandidates,
  levenshteinDistance,
  normalizeStudentName,
  type StudentNameCandidate,
} from "@/lib/students/student-matcher";

import type { FileExtractionState } from "@/types/extraction";
import type { StudentRecord } from "@/types/student";

export type FileStudentMatchSource = "exact" | "fuzzy" | "ai" | "manual" | "filename" | "unmatched";

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
  source: FileStudentMatchSource,
): FileStudentMatch {
  const uniqueRowIndexes = [
    ...new Set(rowIndexes.filter((rowIndex) => Number.isInteger(rowIndex))),
  ];

  return { rowIndex: uniqueRowIndexes[0] ?? null, rowIndexes: uniqueRowIndexes, source };
}

function createUnmatchedFileStudentMatch(): FileStudentMatch {
  return { rowIndex: null, rowIndexes: [], source: "unmatched" };
}

function createResolution(
  totalCandidates: number,
  locallyMatched: number,
  locallyNotEnrolled: number,
  pendingAiTasks: number,
  manualRequiredTasks: number,
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
  source: StudentNameCandidate["source"],
): StudentNameCandidate {
  return { name, normalizedName: normalizeStudentName(name), source };
}

function getUniqueCandidates(candidates: StudentNameCandidate[]): StudentNameCandidate[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const normalized = candidate.normalizedName || normalizeStudentName(candidate.name);

    if (!normalized || seen.has(normalized)) return false;

    seen.add(normalized);
    return true;
  });
}

function isSimpleNameTypo(detectedName: string, studentName: string): boolean {
  const detectedWords = normalizeStudentName(detectedName).split(" ").filter(Boolean);

  const studentWords = normalizeStudentName(studentName).split(" ").filter(Boolean);

  if (detectedWords.length === 0 || detectedWords.length !== studentWords.length) {
    return false;
  }

  let changedWords = 0;
  let totalEdits = 0;

  for (let index = 0; index < detectedWords.length; index += 1) {
    const detectedWord = detectedWords[index];
    const studentWord = studentWords[index];

    if (detectedWord === studentWord) {
      continue;
    }

    const distance = levenshteinDistance(detectedWord, studentWord);

    const longestLength = Math.max(detectedWord.length, studentWord.length);

    const maxWordEdits = longestLength >= 8 ? 2 : 1;

    if (distance > maxWordEdits) {
      return false;
    }

    changedWords += 1;
    totalEdits += distance;
  }

  return changedWords <= 2 && totalEdits <= 2;
}

function getKkStudentCandidates(extraction: FileExtractionState): StudentNameCandidate[] {
  if (!extraction.kk) return [];

  const candidates = getUniqueCandidates(
    getEligibleKkStudents(extraction.kk.anggota_keluarga).map((anggota) =>
      createStudentNameCandidate(anggota.nama_lengkap, "kk"),
    ),
  );

  return candidates;
}

function findExactRowsForCandidate(
  candidate: StudentNameCandidate,
  students: StudentRecord[],
): number[] {
  const normalized = candidate.normalizedName || normalizeStudentName(candidate.name);

  const rows = students
    .filter((student) => normalizeStudentName(student.nama) === normalized)
    .map((student) => student.rowIndex);

  return rows;
}

function createCandidateRows(
  rows: number[],
  fallbackName: string,
  students: StudentRecord[],
): StudentMatchCandidateRow[] {
  return rows.map((rowIndex) => {
    const student = students.find((item) => item.rowIndex === rowIndex);

    return { rowIndex, nama: student?.nama || fallbackName, score: 1 };
  });
}

function createAiTask(
  candidate: StudentNameCandidate,
  students: StudentRecord[],
  excludedRows: Set<number>,
): PendingAiCandidateTask | null {
  const fuzzyCandidates = getFuzzyStudentCandidates([candidate], students, 5)
    .filter(({ student }) => !excludedRows.has(student.rowIndex))
    .filter(({ student }) => isSimpleNameTypo(candidate.name, student.nama));

  if (fuzzyCandidates.length === 0) return null;

  const normalized = candidate.normalizedName || normalizeStudentName(candidate.name);

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
  students: StudentRecord[],
): LocalFileStudentMatchResult {
  const candidates = getKkStudentCandidates(extraction);

  if (candidates.length === 0) {
    console.warn("[KK MATCH DEBUG] Tidak ada kandidat anggota KK yang eligible.");

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
    const normalized = candidate.normalizedName || normalizeStudentName(candidate.name);

    const exactRowsForCandidate = findExactRowsForCandidate(candidate, students);

    if (exactRowsForCandidate.length === 1) {
      const rowIndex = exactRowsForCandidate[0];

      if (!claimedRows.has(rowIndex)) {
        claimedRows.add(rowIndex);
        exactRows.push(rowIndex);
        locallyMatched += 1;
      } else {
        console.warn("RESULT: ROW SUDAH DIKLAIM ANGGOTA LAIN", {
          rowIndex,
          candidate: candidate.name,
        });
      }

      continue;
    }

    if (exactRowsForCandidate.length > 1) {
      console.warn("RESULT: DUPLICATE EXACT NAME", exactRowsForCandidate);

      manualTasks.push({
        taskKey: `duplicate:${normalized}`,
        detectedName: candidate.name,
        reason: "duplicate-name",
        candidates: createCandidateRows(exactRowsForCandidate, candidate.name, students),
      });

      continue;
    }

    const fuzzy = findFuzzyStudentMatch([candidate], students);

    const simpleTypoMatch = fuzzy && isSimpleNameTypo(candidate.name, fuzzy.student.nama);

    if (fuzzy && simpleTypoMatch && !claimedRows.has(fuzzy.student.rowIndex)) {
      claimedRows.add(fuzzy.student.rowIndex);

      fuzzyRows.push(fuzzy.student.rowIndex);

      locallyMatched += 1;
      continue;
    }

    const aiTask = createAiTask(candidate, students, claimedRows);

    if (aiTask) {
      aiTasks.push(aiTask);

      continue;
    }

    locallyNotEnrolled += 1;

    console.warn("RESULT: NOT ENROLLED / NO MATCH", candidate.name);
  }

  const rowIndexes = [...new Set([...exactRows, ...fuzzyRows])];

  let source: FileStudentMatchSource = "unmatched";

  if (fuzzyRows.length > 0) source = "fuzzy";
  else if (exactRows.length > 0) source = "exact";

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
      manualTasks.length,
    ),
  };
}

function getAktaCandidates(extraction: FileExtractionState): StudentNameCandidate[] {
  const nama = extraction.akta?.nama_anak?.trim();

  if (!nama) return [];

  return [createStudentNameCandidate(nama, "akta")];
}

function matchAktaStudentLocally(
  extraction: FileExtractionState,
  students: StudentRecord[],
): LocalFileStudentMatchResult {
  const candidates = getUniqueCandidates(getAktaCandidates(extraction));

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
      .filter((student) => normalizeStudentName(student.nama) === normalized)
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
            candidates: createCandidateRows(exactRows, exact.candidate.name, students),
          },
        ],
        resolution: createResolution(1, 0, 0, 0, 1),
      };
    }
  }

  const fuzzy = findFuzzyStudentMatch(candidates, students);

  if (fuzzy && isSimpleNameTypo(candidate.name, fuzzy.student.nama)) {
    return {
      match: createFileStudentMatch([fuzzy.student.rowIndex], "fuzzy"),
      pendingAi: null,
      manualTasks: [],
      resolution: createResolution(1, 1, 0, 0, 0),
    };
  }

  const aiTask = createAiTask(candidate, students, new Set<number>());

  return {
    match: createUnmatchedFileStudentMatch(),
    pendingAi: aiTask ? { tasks: [aiTask] } : null,
    manualTasks: [],
    resolution: createResolution(1, 0, aiTask ? 0 : 1, aiTask ? 1 : 0, 0),
  };
}

export function matchFileStudentLocally(
  extraction: FileExtractionState,
  students: StudentRecord[],
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

export function getNamedStudentRow(file: File, students: StudentRecord[]): number | null {
  const match = file.name.match(
    /^(.*?)[\s_-]+(?:kk|kartu[\s_-]*keluarga|akta(?:[\s_-]*kelahiran)?)\.pdf$/i,
  );
  if (!match) return null;
  const key = normalizeStudentName(match[1].replace(/[_-]+/g, " ").trim());
  if (!key) return null;
  const exact = students.filter((student) => normalizeStudentName(student.nama) === key);
  if (exact.length === 1) return exact[0].rowIndex;
  const prefix = students.filter((student) =>
    normalizeStudentName(student.nama).startsWith(`${key} `),
  );
  return prefix.length === 1 ? prefix[0].rowIndex : null;
}
