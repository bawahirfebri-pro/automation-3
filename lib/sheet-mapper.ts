import { formatTeksResmi } from './text-formatter';

export function mapDataToRow(targetRow: any, extractedData: any, aktaData: any, namaSiswaTarget: string) {
    const listAnggota = extractedData?.anggota_keluarga || [];

    // SINKRONISASI DATA AKTA KELAHIRAN
    if (aktaData && aktaData.no_akta_kelahiran) {
        try { targetRow.set('No. Akta Kelahiran', aktaData.no_akta_kelahiran.toUpperCase()); } catch (e) { }
    }

    // SINKRONISASI DATA KARTU KELUARGA
    if (extractedData && listAnggota.length > 0) {
        const dataMurid = listAnggota.find((ang: any) => ang.nama_lengkap?.toLowerCase().trim() === namaSiswaTarget)
            || listAnggota.find((ang: any) => ang.status_hubungan_dalam_keluarga?.toLowerCase().includes('anak'))
            || listAnggota[0] || {};

        // Data Murid Inti
        targetRow.set('Nama', formatTeksResmi(dataMurid.nama_lengkap));
        targetRow.set('NIK', dataMurid.nik || '');
        targetRow.set('Jenis Kelamin', formatTeksResmi(dataMurid.jenis_kelamin));
        targetRow.set('Tempat Lahir', formatTeksResmi(dataMurid.tempat_lahir));
        targetRow.set('Tanggal Lahir', dataMurid.tanggal_lahir || '');
        targetRow.set('Agama', formatTeksResmi(dataMurid.agama));
        targetRow.set('Golongan Darah', dataMurid.golongan_darah && dataMurid.golongan_darah.toLowerCase() !== 'tidak tahu' ? dataMurid.golongan_darah.toUpperCase() : (dataMurid.golongan_darah ? 'Tidak Tahu' : ''));
        targetRow.set('Nama Ayah Kandung', formatTeksResmi(dataMurid.nama_ayah));
        targetRow.set('Nama Ibu Kandung', formatTeksResmi(dataMurid.nama_ibu));

        // Data Alamat KK
        targetRow.set('No. Kartu Keluarga', extractedData.no_kk || '');
        targetRow.set('Alamat', formatTeksResmi(extractedData.alamat));
        targetRow.set('RT', formatTeksResmi(extractedData.rt));
        targetRow.set('RW', formatTeksResmi(extractedData.rw));
        targetRow.set('Desa/Kelurahan', formatTeksResmi(extractedData.kelurahan));
        targetRow.set('Kecamatan', formatTeksResmi(extractedData.kecamatan));
        targetRow.set('Kabupaten/Kota', formatTeksResmi(extractedData.kabupaten_kota));
        targetRow.set('Provinsi', formatTeksResmi(extractedData.provinsi));
        targetRow.set('Kode Pos', extractedData.kode_pos || '');
        targetRow.set('Tanggal Terbit KK', extractedData.tanggal_dikeluarkan || '');

        // Cari Data Ayah & Ibu (Diperbaiki)
        const dataAyahKK = listAnggota.find((ang: any) => {
            const status = ang.status_hubungan_dalam_keluarga?.toLowerCase() || '';
            const jk = ang.jenis_kelamin?.toLowerCase() || '';

            // Ayah = Laki-laki yang menjadi Kepala Keluarga, ATAU berstatus Suami
            return (status.includes('kepala keluarga') && jk.includes('laki')) || status.includes('suami');
        });

        const dataIbuKK = listAnggota.find((ang: any) => {
            const status = ang.status_hubungan_dalam_keluarga?.toLowerCase() || '';
            const jk = ang.jenis_kelamin?.toLowerCase() || '';

            // Ibu = Perempuan yang menjadi Kepala Keluarga, ATAU berstatus Istri/Isteri
            return (status.includes('kepala keluarga') && jk.includes('perempuan')) || status.includes('istri') || status.includes('isteri');
        });

        // Mapping Data Ayah
        if (dataAyahKK) {
            try {
                targetRow.set('Nama Ayah', formatTeksResmi(dataAyahKK.nama_lengkap));
                targetRow.set('NIK Ayah', dataAyahKK.nik || '');
                targetRow.set('Tempat Lahir Ayah', formatTeksResmi(dataAyahKK.tempat_lahir));
                targetRow.set('Tanggal Lahir Ayah', dataAyahKK.tanggal_lahir || '');
                targetRow.set('Agama Ayah', formatTeksResmi(dataAyahKK.agama));
                targetRow.set('Golongan Darah Ayah', dataAyahKK.golongan_darah && dataAyahKK.golongan_darah.toLowerCase() !== 'tidak tahu' ? dataAyahKK.golongan_darah.toUpperCase() : (dataAyahKK.golongan_darah ? 'Tidak Tahu' : ''));
                targetRow.set('Nama Ayah dari Ayah', formatTeksResmi(dataAyahKK.nama_ayah));
                targetRow.set('Nama Ibu dari Ayah', formatTeksResmi(dataAyahKK.nama_ibu));
            } catch (e) { }
        }

        // Mapping Data Ibu
        if (dataIbuKK) {
            try {
                targetRow.set('Nama Ibu', formatTeksResmi(dataIbuKK.nama_lengkap));
                targetRow.set('NIK Ibu', dataIbuKK.nik || '');
                targetRow.set('Tempat Lahir Ibu', formatTeksResmi(dataIbuKK.tempat_lahir));
                targetRow.set('Tanggal Lahir Ibu', dataIbuKK.tanggal_lahir || '');
                targetRow.set('Agama Ibu', formatTeksResmi(dataIbuKK.agama));
                targetRow.set('Golongan Darah Ibu', dataIbuKK.golongan_darah && dataIbuKK.golongan_darah.toLowerCase() !== 'tidak tahu' ? dataIbuKK.golongan_darah.toUpperCase() : (dataIbuKK.golongan_darah ? 'Tidak Tahu' : ''));
                targetRow.set('Nama Ayah dari Ibu', formatTeksResmi(dataIbuKK.nama_ayah));
                targetRow.set('Nama Ibu dari Ibu', formatTeksResmi(dataIbuKK.nama_ibu));
            } catch (e) { }
        }

        // Mapping Anggota Lainnya (Maks 10)
        listAnggota.forEach((ang: any, i: number) => {
            const n = i + 1;
            if (n <= 10) {
                try { targetRow!.set(`Nama Anggota ${n}`, formatTeksResmi(ang.nama_lengkap)); } catch (e) { }
                try { targetRow!.set(`NIK Anggota ${n}`, ang.nik || ''); } catch (e) { }
                try { targetRow!.set(`Status Anggota ${n}`, formatTeksResmi(ang.status_hubungan_dalam_keluarga)); } catch (e) { }
                try { targetRow!.set(`Tempat Lahir Anggota ${n}`, formatTeksResmi(ang.tempat_lahir)); } catch (e) { }
                try { targetRow!.set(`Tanggal Lahir Anggota ${n}`, ang.tanggal_lahir || ''); } catch (e) { }
                try { targetRow!.set(`Agama Anggota ${n}`, formatTeksResmi(ang.agama)); } catch (e) { }
                try { targetRow!.set(`Golongan Darah Anggota ${n}`, ang.golongan_darah && ang.golongan_darah.toLowerCase() !== 'tidak tahu' ? ang.golongan_darah.toUpperCase() : (ang.golongan_darah ? 'Tidak Tahu' : '')); } catch (e) { }
                try { targetRow!.set(`Pendidikan Anggota ${n}`, formatTeksResmi(ang.pendidikan)); } catch (e) { }
                try { targetRow!.set(`Pekerjaan Anggota ${n}`, formatTeksResmi(ang.jenis_pekerjaan)); } catch (e) { }
                try { targetRow!.set(`Nama Ayah dari Anggota ${n}`, formatTeksResmi(ang.nama_ayah)); } catch (e) { }
                try { targetRow!.set(`Nama Ibu dari Anggota ${n}`, formatTeksResmi(ang.nama_ibu)); } catch (e) { }
            }
        });
    }
}