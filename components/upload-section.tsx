import { extractStudentName } from "@/lib/utils/document";

export default function UploadSection({
  files,
  isExtracting,
  errorMsg,
  onFileChange,
  onRemoveFile,
  onSubmit,
}: {
  files: File[];
  isExtracting: boolean;
  errorMsg: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const studentNamePreview =
  files.length > 0
    ? extractStudentName(files[0].name)
    : "";

  const isDisabled = files.length === 0 || isExtracting;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V4m0 0L8 8m4-4 4 4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 14v4.25A1.75 1.75 0 0 0 6.75 20h10.5A1.75 1.75 0 0 0 19 18.25V14"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Tambahkan Dokumen
            </h2>
            <p className="text-xs text-gray-500">
              Upload KK dan Akta Kelahiran dalam format PDF
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="p-5">
        {/* Upload Area */}
        <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-5 py-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm ring-1 ring-gray-100 transition-colors group-hover:text-blue-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 3.75h6.5L18.25 8.5V20A1.25 1.25 0 0 1 17 21.25H7A1.25 1.25 0 0 1 5.75 20V5A1.25 1.25 0 0 1 7 3.75Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 3.75V8.5h4.75"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 14h6M12 11v6"
              />
            </svg>
          </div>

          <span className="text-sm font-medium text-gray-700">
            Pilih dokumen PDF
          </span>

          <span className="mt-1 text-xs text-gray-400">
            Bisa memilih beberapa file sekaligus
          </span>

          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={onFileChange}
            className="hidden"
          />
        </label>

        {/* File Queue */}
        {files.length > 0 && (
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-gray-700">
                  Antrean Dokumen
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {files.length} dokumen dipilih
                </p>
              </div>

              <span
                title={studentNamePreview}
                className="max-w-[180px] truncate rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700"
              >
                {studentNamePreview}
              </span>
            </div>

            <ul className="divide-y divide-gray-100">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
                      <span className="text-[10px] font-bold">PDF</span>
                    </div>

                    <span
                      title={file.name}
                      className="truncate text-xs text-gray-600"
                    >
                      {file.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label={`Hapus ${file.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isDisabled}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
            isDisabled
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.99]"
          }`}
        >
          {isExtracting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}

          {isExtracting
            ? "Sedang menganalisis..."
            : "Mulai Ekstrak Data"}
        </button>

        {/* Error */}
        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex gap-2">
              <span>!</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}