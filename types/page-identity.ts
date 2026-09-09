export type PageDocumentType = "kk" | "akta" | "unknown";

export interface PageIdentity {
  documentType: PageDocumentType;
  noKk: string;
  namaKepalaKeluarga: string;
}
