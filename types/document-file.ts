export type DocumentType = "kk" | "akta" | "both";

export interface DocumentDisplayFile {
  file: File;
  fileKey: string;
  outputKey: string;
  originalName: string;
  displayName: string;
  documentType: DocumentType | null;
  renamed: boolean;
  studentRowIndex: number | null;
  studentName: string;
  virtual: boolean;
}
