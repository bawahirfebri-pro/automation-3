export default function SaveSection({
  saving,
  saveMessage,
  onSave,
  hasData,
  warnings = [],
}: {
  saving: boolean;
  saveMessage: string;
  onSave: () => void;
  hasData: boolean;
  warnings?: string[];
}) {
  if (!hasData) return null;

  const hasErrors = warnings.length > 0;

  return (
    <div className="w-full">
      {/* Validation Warning */}
      {hasErrors && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              ⚠
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-amber-900">
                Pengiriman belum dapat dilakukan
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-amber-700">
                Sistem menemukan beberapa data yang perlu diperiksa
                sebelum dokumen dapat dikirim.
              </p>

              <ul className="mt-3 space-y-1.5 text-xs text-amber-800">
                {warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="flex gap-2"
                  >
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Save Action */}
      <div
        className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
          hasErrors
            ? "border-gray-200 bg-gray-50"
            : "border-gray-800 bg-gray-900"
        }`}
      >
        <div>
          <div
            className={`text-sm font-semibold ${
              hasErrors ? "text-gray-500" : "text-white"
            }`}
          >
            Simpan ke Database
          </div>

          <p
            className={`mt-1 text-xs ${
              hasErrors ? "text-gray-400" : "text-gray-400"
            }`}
          >
            {hasErrors
              ? "Perbaiki data yang bermasalah untuk melanjutkan."
              : "Data siap disinkronkan ke Google Sheet."}
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || hasErrors}
          className={`inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
            hasErrors
              ? "cursor-not-allowed bg-gray-200 text-gray-400"
              : saving
              ? "cursor-not-allowed bg-gray-700 text-gray-400"
              : "bg-white text-gray-900 hover:bg-gray-100 active:scale-[0.98]"
          }`}
        >
          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400/40 border-t-gray-700" />
          )}

          {saving
            ? "Menyinkronkan..."
            : "Kirim Data ke Sheet"}
        </button>
      </div>

      {/* Save Result */}
      {saveMessage && !hasErrors && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-center text-sm font-medium ${
            saveMessage.includes("Sukses")
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {saveMessage}
        </div>
      )}
    </div>
  );
}