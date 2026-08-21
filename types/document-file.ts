import type { ExtractedDocumentType } from "@/hooks/use-document-extraction";

export interface DocumentDisplayFile {
  file: File;
  fileKey: string;
  originalName: string;
  displayName: string;
  documentType: ExtractedDocumentType | null;
  renamed: boolean;
}