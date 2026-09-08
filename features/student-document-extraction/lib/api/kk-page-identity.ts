import type {
  PageDocumentType,
  PageIdentity,
} from "@/types/page-identity";

export async function getKkPageIdentity(
  file: File
): Promise<PageIdentity> {
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

export async function getKkPageIdentityWithTimeout(file: File, timeoutMs = 15000) {
  return Promise.race([
    getKkPageIdentity(file),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout membaca identitas ${file.name}`)), timeoutMs);
    }),
  ]);
}