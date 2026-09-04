export type PageDocumentType =
  | "kk"
  | "akta"
  | "unknown";

export interface KkPageIdentity {
  documentType: PageDocumentType;
  noKk: string;
  namaKepalaKeluarga: string;
}

export async function getKkPageIdentity(
  file: File
): Promise<KkPageIdentity> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  const response =
    await fetch(
      "/api/kk-page-identity",
      {
        method: "POST",
        body: formData,
      }
    );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Gagal membaca identitas halaman KK."
    );
  }

  const documentType:
  PageDocumentType =
    result.documentType === "kk" ||
    result.documentType === "akta"
      ? result.documentType
      : "unknown";

return {
  documentType,

  noKk:
    String(
      result.noKk ?? ""
    ),

  namaKepalaKeluarga:
    String(
      result.namaKepalaKeluarga ??
        ""
    ),
};
}