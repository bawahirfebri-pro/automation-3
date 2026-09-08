interface Params {
  hasKkExtraction: boolean;
  rawRows: number[];
  scopedRows: number[];
  studentRowIndex: number | null;
}

type DocumentRemovalPlan =
  | {
      mode: "virtual";
      remainingRows: number[];
    }
  | {
      mode: "physical";
      remainingRows: [];
    };

export function planDocumentRemoval({
  hasKkExtraction,
  rawRows,
  scopedRows,
  studentRowIndex,
}: Params): DocumentRemovalPlan {
  const currentScopedRows = [...new Set(scopedRows)];
  const isSharedKk =
    hasKkExtraction &&
    rawRows.length > 1 &&
    studentRowIndex !== null;

  if (isSharedKk) {
    const remainingRows = currentScopedRows.filter(
      (rowIndex) => rowIndex !== studentRowIndex
    );

    if (remainingRows.length > 0) {
      return {
        mode: "virtual",
        remainingRows,
      };
    }
  }

  return {
    mode: "physical",
    remainingRows: [],
  };
}