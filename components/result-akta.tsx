export default function ResultAkta({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="p-6 border border-gray-200 bg-white rounded-xl shadow-sm mb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
      <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Informasi Akta Kelahiran</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm p-5 bg-green-50/40 rounded-xl border border-green-100">
        <p><span className="font-semibold text-gray-600 inline-block w-36">No. Akta Kelahiran</span>: <span className="font-mono text-green-700 font-bold text-base">{data.no_akta_kelahiran || '-'}</span></p>
        <p><span className="font-semibold text-gray-600 inline-block w-36">Nama Anak</span>: <span className="font-bold text-gray-800">{data.nama_anak || '-'}</span></p>
        <p><span className="font-semibold text-gray-600 inline-block w-36">Tempat Lahir</span>: <span>{data.tempat_lahir || '-'}</span></p>
        <p><span className="font-semibold text-gray-600 inline-block w-36">Tanggal Lahir</span>: <span className="font-mono">{data.tanggal_lahir || '-'}</span></p>
        <p><span className="font-semibold text-gray-600 inline-block w-36">Nama Ayah</span>: <span>{data.nama_ayah || '-'}</span></p>
        <p><span className="font-semibold text-gray-600 inline-block w-36">Nama Ibu</span>: <span>{data.nama_ibu || '-'}</span></p>
      </div>
    </div>
  );
}