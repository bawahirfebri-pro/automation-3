export default function ResultKk({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="p-6 border border-gray-200 bg-white rounded-xl shadow-sm mb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
      <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Informasi Kartu Keluarga</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm p-5 bg-blue-50/40 rounded-xl border border-blue-100">
        <p><span className="font-semibold text-gray-600 inline-block w-32">No. KK</span>: <span className="font-mono text-blue-700 font-bold">{data.no_kk}</span></p>
        <p><span className="font-semibold text-gray-600 inline-block w-32">Tgl. Terbit</span>: <span className="font-semibold">{data.tanggal_dikeluarkan || '-'}</span></p>
        <p><span className="font-semibold text-gray-600 inline-block w-32">Alamat</span>: {data.alamat}</p>
        <p><span className="font-semibold text-gray-600 inline-block w-32">RT / RW</span>: {data.rt} / {data.rw}</p>
        <p><span className="font-semibold text-gray-600 inline-block w-32">Kelurahan/Desa</span>: {data.kelurahan}</p>
        <p><span className="font-semibold text-gray-600 inline-block w-32">Kecamatan</span>: {data.kecamatan}</p>
        <p><span className="font-semibold text-gray-600 inline-block w-32">Kabupaten/Kota</span>: {data.kabupaten_kota}</p>
        <p><span className="font-semibold text-gray-600 inline-block w-32">Provinsi</span>: {data.provinsi}</p>
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-3">Daftar Anggota Keluarga</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse border border-gray-200">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border p-2 whitespace-nowrap">NIK</th>
              <th className="border p-2 min-w-[150px]">Nama Lengkap</th>
              <th className="border p-2 text-center">J.K.</th>
              <th className="border p-2">Tempat Lahir</th>
              <th className="border p-2 whitespace-nowrap">Tgl Lahir</th>
              <th className="border p-2 text-center">Goldar</th>
              <th className="border p-2">Agama</th>
              <th className="border p-2">Pendidikan</th>
              <th className="border p-2">Pekerjaan</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Nama Ayah</th>
              <th className="border p-2">Nama Ibu</th>
            </tr>
          </thead>
          <tbody>
            {data.anggota_keluarga && data.anggota_keluarga.map((anggota: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border p-2 font-mono text-gray-600">{anggota.nik}</td>
                <td className="border p-2 font-medium">{anggota.nama_lengkap}</td>
                <td className="border p-2 text-center">{anggota.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                <td className="border p-2">{anggota.tempat_lahir}</td>
                <td className="border p-2 font-mono text-gray-600">{anggota.tanggal_lahir}</td>
                <td className="border p-2 text-center font-bold text-red-600">{anggota.golongan_darah || '-'}</td>
                <td className="border p-2">{anggota.agama}</td>
                <td className="border p-2">{anggota.pendidikan}</td>
                <td className="border p-2">{anggota.jenis_pekerjaan}</td>
                <td className="border p-2">{anggota.status_hubungan_dalam_keluarga}</td>
                <td className="border p-2">{anggota.nama_ayah}</td>
                <td className="border p-2">{anggota.nama_ibu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}