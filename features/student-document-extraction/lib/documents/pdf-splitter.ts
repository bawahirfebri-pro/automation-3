import { PDFDocument } from "pdf-lib";

export interface PdfPageSplitResult {
  sourceFile: File;
  sourceName: string;
  sourcePageCount: number;
  pageIndex: number;
  pageNumber: number;
  file: File;
}

function createSplitFileName(
  originalName: string,
  pageNumber: number
): string {
  const baseName = originalName
    .replace(/\.pdf$/i, "")
    .trim();

  return `${baseName}__part_${pageNumber}.pdf`;
}

export async function getPdfPageCount(
  file: File
): Promise<number> {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error(
      `"${file.name}" bukan file PDF.`
    );
  }

  if (file.size === 0) {
    throw new Error(
      `"${file.name}" kosong.`
    );
  }

  const bytes =
    await file.arrayBuffer();

  const pdf =
    await PDFDocument.load(bytes);

  return pdf.getPageCount();
}

export async function splitPdfByPage(
  file: File
): Promise<PdfPageSplitResult[]> {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error(
      `"${file.name}" bukan file PDF.`
    );
  }

  if (file.size === 0) {
    throw new Error(
      `"${file.name}" kosong.`
    );
  }

  const bytes =
    await file.arrayBuffer();

  const sourcePdf =
    await PDFDocument.load(bytes);

  const pageCount =
    sourcePdf.getPageCount();

  const results:
    PdfPageSplitResult[] = [];

  for (
  let pageIndex = 0;
  pageIndex < pageCount;
  pageIndex += 1
) {
  const outputPdf =
    await PDFDocument.create();

  const [page] =
    await outputPdf.copyPages(
      sourcePdf,
      [pageIndex]
    );

  outputPdf.addPage(page);

  const outputBytes =
    await outputPdf.save();

  const outputBuffer =
    outputBytes.buffer.slice(
      outputBytes.byteOffset,
      outputBytes.byteOffset +
        outputBytes.byteLength
    ) as ArrayBuffer;

  const pageNumber =
    pageIndex + 1;

  const outputFile =
    new File(
      [outputBuffer],
      createSplitFileName(
        file.name,
        pageNumber
      ),
      {
        type: "application/pdf",
        lastModified: Date.now(),
      }
    );

  results.push({
    sourceFile: file,
    sourceName: file.name,
    sourcePageCount: pageCount,
    pageIndex,
    pageNumber,
    file: outputFile,
  });
}

  return results;
}

export async function mergePdfParts(
  sourceName: string,
  parts: PdfPageSplitResult[],
  groupNumber: number
): Promise<File> {
  if (parts.length === 0) {
    throw new Error(
      "Tidak ada halaman PDF untuk digabung."
    );
  }

  const outputPdf =
    await PDFDocument.create();

  const sortedParts =
    [...parts].sort(
      (a, b) =>
        a.pageNumber -
        b.pageNumber
    );

  for (const part of sortedParts) {
    const bytes =
      await part.file.arrayBuffer();

    const sourcePdf =
      await PDFDocument.load(
        bytes
      );

    const copiedPages =
      await outputPdf.copyPages(
        sourcePdf,
        sourcePdf.getPageIndices()
      );

    copiedPages.forEach(
      (page) =>
        outputPdf.addPage(page)
    );
  }

  const outputBytes =
    await outputPdf.save();

  const outputBuffer =
    outputBytes.buffer.slice(
      outputBytes.byteOffset,
      outputBytes.byteOffset +
        outputBytes.byteLength
    ) as ArrayBuffer;

  const baseName =
    sourceName
      .replace(/\.pdf$/i, "")
      .trim();

  return new File(
    [outputBuffer],
    `${baseName}__kk_${groupNumber}.pdf`,
    {
      type: "application/pdf",
      lastModified: Date.now(),
    }
  );
}