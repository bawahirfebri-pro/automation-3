import { useState } from "react";
import type { AktaResult } from "@/types/akta";
import type { KkResult } from "@/types/kk";
import { saveToSheet } from "@/lib/api/sheet";

const DEFAULT_SAVE_ERROR = "Terjadi kesalahan jaringan saat mengirim ke Google Sheet.";
const SUCCESS_SAVE_MESSAGE = "Sukses! Data siswa berhasil disinkronkan.";

interface SaveData {
  extractedData: KkResult | null;
  aktaData: AktaResult | null;
  fileName: string;
}

export function useSaveToSheet() {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const save = async (dataToSave: SaveData) => {
    if (saving) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const data = await saveToSheet(dataToSave);

      if (data.success) {
        setSaveMessage(SUCCESS_SAVE_MESSAGE);
        return;
      }

      setSaveMessage(
        `Gagal: ${data.message || data.error || "Data gagal disimpan."}`
      );
    } catch {
      setSaveMessage(DEFAULT_SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const clearSaveMessage = () => {
    setSaveMessage("");
  };

  return {
    saving,
    saveMessage,
    save,
    clearSaveMessage,
  };
}