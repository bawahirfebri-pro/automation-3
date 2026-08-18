export default function SaveSection({
  saving,
  saveMessage,
  onSave,
  hasData
}: {
  saving: boolean;
  saveMessage: string;
  onSave: () => void;
  hasData: boolean;
}) {
  if (!hasData) return null;

  return (
    <>
      <div className="p-6 bg-gray-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div>
          <h4 className="font-bold text-white text-xl">Simpan ke Database</h4>
          <p className="text-sm text-gray-400 mt-1">Sistem siap mengirimkan data dokumen ini ke Google Sheet.</p>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className={`py-3 px-10 rounded-xl font-bold text-white text-lg transition-all shadow-lg
            ${saving ? "bg-gray-700 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 hover:scale-105"}`}
        >
          {saving ? "Menyinkronkan..." : "Kirim Data ke Sheet"}
        </button>
      </div>

      {saveMessage && (
        <div className={`mt-5 p-4 rounded-xl text-center font-bold text-lg shadow-sm ${saveMessage.includes("Sukses") ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"}`}>
          {saveMessage}
        </div>
      )}
    </>
  );
}