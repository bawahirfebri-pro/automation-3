import { useCallback, useState } from "react";

import { saveToSheet } from "@/lib/api/sheet";

import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";

const DEFAULT_SAVE_ERROR = "Terjadi kesalahan jaringan saat mengirim ke Google Sheet.";
const SUCCESS_SAVE_MESSAGE = "Sukses! Data siswa berhasil disinkronkan.";

interface SaveData {
  rowIndex: number;
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  fileName: string;
}

interface SaveResult {
  success: boolean;
  message: string;
}

export function useSaveToSheet() {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const save = useCallback(async (dataToSave: SaveData): Promise<SaveResult> => {
    if (saving) {
      return {
        success: false,
        message: "Proses penyimpanan sedang berlangsung.",
      };
    }

    setSaving(true);
    setSaveMessage("");

    try {
      const data = await saveToSheet(dataToSave);

      if (data.success) {
        setSaveMessage(SUCCESS_SAVE_MESSAGE);

        return {
          success: true,
          message: SUCCESS_SAVE_MESSAGE,
        };
      }

      const message =
        data.message ||
        ("error" in data ? data.error : "") ||
        "Data gagal disimpan.";

      setSaveMessage(`Gagal: ${message}`);

      return {
        success: false,
        message,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : DEFAULT_SAVE_ERROR;

      setSaveMessage(`Gagal: ${message}`);

      return {
        success: false,
        message,
      };
    } finally {
      setSaving(false);
    }
  }, [saving]);

  const clearSaveMessage = useCallback(() => {
    setSaveMessage("");
  }, []);

  return {
    saving,
    saveMessage,
    save,
    clearSaveMessage,
  };
}