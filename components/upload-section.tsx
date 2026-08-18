export default function UploadSection({
  files,
  isExtracting,
  errorMsg,
  onFileChange,
  onRemoveFile,
  onSubmit
}: {
  files: File[];
  isExtracting: boolean;
  errorMsg: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="mb-10 p-8 border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-2xl">
      <form onSubmit={onSubmit} className="flex flex-col items-center gap-5 max-w-md mx-auto">
        <div className="w-full text-center">
          <label className="block text-sm font-bold text-blue-800 mb-3">Tambahkan Dokumen PDF (KK / Akta)</label>
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={onFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 border border-gray-200 rounded-xl bg-white p-2 cursor-pointer transition-colors"
          />
        </div>

        {files.length > 0 && (
          <div className="w-full text-sm text-left bg-white p-4 rounded-xl border shadow-sm">
            <span className="font-semibold text-gray-700">Daftar Antrean File ({files.length}):</span>
            <ul className="mt-3 flex flex-col gap-2">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between bg-blue-50/50 border border-blue-100 p-2 px-3 rounded-lg">
                  <span className="font-mono text-gray-700 truncate mr-2" title={f.name}>📄 {f.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(i)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors font-bold"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit" disabled={files.length === 0 || isExtracting}
          className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all shadow-md
            ${(files.length === 0 || isExtracting) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5"}`}
        >
          {isExtracting ? "Sedang Menganalisis Dokumen..." : "Mulai Ekstrak Data"}
        </button>
      </form>

      {errorMsg && <div className="mt-5 p-4 bg-red-100 text-red-700 rounded-xl text-center font-semibold">{errorMsg}</div>}
    </div>
  );
}