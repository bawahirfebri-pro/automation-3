interface SaveSectionProps {
  saving: boolean;
  saveMessage: string;
  hasData: boolean;
  warnings: string[];
  onSave: () => void | Promise<void>;
}

export default function SaveSection({
  saving,
  saveMessage,
  hasData,
  warnings,
  onSave,
}: SaveSectionProps) {
  const hasWarnings = warnings.length > 0;
  const isSuccess =
    saveMessage.toLowerCase().includes("sukses") ||
    saveMessage.toLowerCase().includes("berhasil");

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Sinkronisasi Data
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Periksa hasil ekstraksi sebelum mengirim data ke Google Sheet.
          </p>
        </div>

        {hasData && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              hasWarnings
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {hasWarnings
              ? `${warnings.length} perlu diperiksa`
              : "Siap disimpan"}
          </span>
        )}
      </div>

      <div className="p-5">
        {/* Empty */}
        {!hasData && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-5 text-center">
            <p className="text-sm font-medium text-gray-500">
              Belum ada data untuk disimpan
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Ekstrak dokumen KK atau Akta terlebih dahulu.
            </p>
          </div>
        )}

        {/* Warning */}
        {hasData && hasWarnings && (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                !
              </span>
              <p className="text-xs font-semibold text-amber-800">
                Periksa data berikut
              </p>
            </div>

            <ul className="space-y-1.5 pl-7">
              {warnings.map((warning, index) => (
                <li
                  key={`${warning}-${index}`}
                  className="text-xs leading-5 text-amber-700"
                >
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ready */}
        {hasData && !hasWarnings && !saveMessage && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
              ✓
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800">
                Data siap disinkronkan
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-600">
                Tidak ditemukan peringatan pada hasil ekstraksi.
              </p>
            </div>
          </div>
        )}

        {/* Save message */}
        {saveMessage && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              isSuccess
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-red-100 bg-red-50 text-red-700"
            }`}
          >
            {saveMessage}
          </div>
        )}

        {/* Action */}
        <button
          type="button"
          onClick={onSave}
          disabled={!hasData || saving}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
            !hasData || saving
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.99]"
          }`}
        >
          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}

          {saving
            ? "Menyinkronkan..."
            : "Simpan ke Google Sheet"}
        </button>
      </div>
    </div>
  );
}