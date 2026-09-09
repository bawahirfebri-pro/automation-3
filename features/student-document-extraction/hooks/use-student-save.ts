import { useCallback, useRef, useState } from "react";

import { saveStudentData } from "@/features/student-document-extraction/lib/api/student-save";

import type { StudentSaveData } from "@/features/student-document-extraction/types/student-save";

const DEFAULT_SAVE_ERROR = "Terjadi kesalahan jaringan saat menyimpan data murid.";

const SUCCESS_SAVE_MESSAGE = "Sukses! Data siswa berhasil disinkronkan.";

interface SaveResult {
  success: boolean;
  message: string;
}

interface SaveManyItemResult extends SaveResult {
  rowIndex: number;
  fileName: string;
}

interface SaveManyResult {
  success: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  results: SaveManyItemResult[];
  message: string;
}

export function useStudentSave() {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  /*
   * Ref dipakai sebagai lock karena state `saving` tidak berubah
   * secara sinkron pada event yang sama.
   */
  const savingRef = useRef(false);

  const executeSave = useCallback(async (dataToSave: StudentSaveData): Promise<SaveResult> => {
    try {
      const data = await saveStudentData(dataToSave);

      if (data.success) {
        return { success: true, message: data.message || SUCCESS_SAVE_MESSAGE };
      }

      const message = data.message || ("error" in data ? data.error : "") || "Data gagal disimpan.";

      return { success: false, message };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : DEFAULT_SAVE_ERROR,
      };
    }
  }, []);

  const save = useCallback(
    async (dataToSave: StudentSaveData): Promise<SaveResult> => {
      if (savingRef.current) {
        return { success: false, message: "Proses penyimpanan sedang berlangsung." };
      }

      savingRef.current = true;
      setSaving(true);
      setSaveMessage("");

      try {
        const result = await executeSave(dataToSave);

        setSaveMessage(result.success ? SUCCESS_SAVE_MESSAGE : `Gagal: ${result.message}`);

        return result;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [executeSave],
  );

  const saveMany = useCallback(
    async (items: StudentSaveData[]): Promise<SaveManyResult> => {
      if (savingRef.current) {
        return {
          success: false,
          total: items.length,
          successCount: 0,
          failedCount: items.length,
          results: [],
          message: "Proses penyimpanan sedang berlangsung.",
        };
      }

      const validItems = items.filter(
        (item) =>
          Number.isInteger(item.rowIndex) &&
          Boolean(item.extractedData || item.aktaData) &&
          Boolean(item.fileName.trim()),
      );

      if (validItems.length === 0) {
        return {
          success: false,
          total: 0,
          successCount: 0,
          failedCount: 0,
          results: [],
          message: "Tidak ada data siswa yang dapat disimpan.",
        };
      }

      /*
       * Proteksi supaya row siswa yang sama tidak ditulis dua kali
       * dalam satu operasi batch.
       */
      const uniqueItems = [...new Map(validItems.map((item) => [item.rowIndex, item])).values()];

      savingRef.current = true;
      setSaving(true);
      setSaveMessage("");

      try {
        /*
         * Sengaja sequential, bukan Promise.all().
         *
         * Alasannya:
         * - lebih aman terhadap rate limit layanan penyimpanan;
         * - error satu siswa tidak membatalkan siswa lain;
         * - urutan hasil tetap sesuai request.
         */
        const results: SaveManyItemResult[] = [];

        for (const item of uniqueItems) {
          const result = await executeSave(item);

          results.push({ rowIndex: item.rowIndex, fileName: item.fileName, ...result });
        }

        const successCount = results.filter((result) => result.success).length;

        const failedCount = results.length - successCount;

        const success = results.length > 0 && failedCount === 0;

        let message: string;

        if (success) {
          message =
            results.length === 1
              ? SUCCESS_SAVE_MESSAGE
              : `${successCount} data siswa berhasil disinkronkan.`;
        } else if (successCount > 0) {
          message = `${successCount} siswa berhasil, ` + `${failedCount} siswa gagal disimpan.`;
        } else {
          message = results[0]?.message || "Semua data siswa gagal disimpan.";
        }

        setSaveMessage(success || successCount > 0 ? message : `Gagal: ${message}`);

        return { success, total: results.length, successCount, failedCount, results, message };
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [executeSave],
  );

  const clearSaveMessage = useCallback(() => {
    setSaveMessage("");
  }, []);

  return { saving, saveMessage, save, saveMany, clearSaveMessage };
}
