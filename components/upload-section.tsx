interface UploadSectionProps {
    files: File[];
    isExtracting: boolean;
    errorMsg: string;
    hasKkResult: boolean;
    hasAktaResult: boolean;
    hasPendingFiles: boolean;
    onFileChange: (
        event: React.ChangeEvent<HTMLInputElement>
    ) => void;
    onRemoveFile: (
        index: number
    ) => void;
}

export default function UploadSection({
    files,
    isExtracting,
    errorMsg,
    hasKkResult,
    hasAktaResult,
    hasPendingFiles,
    onFileChange,
    onRemoveFile,
}: UploadSectionProps) {
    const studentNamePreview =
        files.length > 0
            ? files[0].name
                .toLowerCase()
                .replace(/_kk\.pdf$/i, "")
                .replace(/_akta\.pdf$/i, "")
                .replace(/\.pdf$/i, "")
                .replace(/_/g, " ")
                .trim()
            : "";

    const getFileStatus = (
        file: File
    ) => {
        const fileName =
            file.name.toLowerCase();

        const isAkta =
            fileName.includes("akta");

        if (
            isAkta &&
            hasAktaResult
        ) {
            return {
                label: "Berhasil",
                className:
                    "bg-emerald-50 text-emerald-700",
            };
        }

        if (
            !isAkta &&
            hasKkResult
        ) {
            return {
                label: "Berhasil",
                className:
                    "bg-emerald-50 text-emerald-700",
            };
        }

        if (isExtracting) {
            return {
                label: "Memproses",
                className:
                    "bg-amber-50 text-amber-700",
            };
        }

        return {
            label: hasPendingFiles
                ? "Siap"
                : "Selesai",
            className:
                "bg-gray-100 text-gray-500",
        };
    };

    return (
        <div className="flex h-full min-h-121 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
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

            <div className="flex flex-1 flex-col p-5">
                <label
                    className={`group flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${isExtracting
                            ? "cursor-not-allowed border-gray-200 bg-gray-50"
                            : "cursor-pointer border-gray-300 bg-gray-50/70 hover:border-blue-400 hover:bg-blue-50/40"
                        }`}
                >
                    {isExtracting ? (
                        <>
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                                <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
                            </div>

                            <span className="text-sm font-semibold text-gray-700">
                                Sedang memproses dokumen
                            </span>

                            <span className="mt-1 max-w-[280px] text-xs leading-5 text-gray-400">
                                AI sedang membaca dan mengekstrak data dari dokumen. Mohon tunggu beberapa saat.
                            </span>
                        </>
                    ) : (
                        <>
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
                                File akan langsung diekstrak setelah dipilih
                            </span>
                        </>
                    )}

                    <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={onFileChange}
                        disabled={isExtracting}
                        className="hidden"
                    />
                </label>

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
                            {files.map((file, index) => {
                                const status =
                                    getFileStatus(file);

                                return (
                                    <li
                                        key={`${file.name}-${index}`}
                                        className="flex items-center justify-between gap-3 px-4 py-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
                                                <span className="text-[10px] font-bold">
                                                    PDF
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <span
                                                    title={file.name}
                                                    className="block truncate text-xs text-gray-600"
                                                >
                                                    {file.name}
                                                </span>
                                                <span
                                                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                                                >
                                                    {status.label}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                onRemoveFile(index)
                                            }
                                            disabled={isExtracting}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                                            aria-label={`Hapus ${file.name}`}
                                        >
                                            ×
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
        
                {errorMsg && (
                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <div className="flex gap-2">
                            <span>!</span>
                            <span className="whitespace-pre-line">
                                {errorMsg}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}