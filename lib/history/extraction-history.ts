import type { ExtractionHistoryItem } from "@/types/extraction-history";

const STORAGE_KEY = "extraction-history";

const HISTORY_TTL_MS = 12 * 60 * 60 * 1000;

const MAX_HISTORY_ITEMS = 50;

function isHistoryExpired(item: ExtractionHistoryItem): boolean {
  const updatedAt = new Date(item.updatedAt).getTime();

  if (Number.isNaN(updatedAt)) {
    return true;
  }

  return Date.now() - updatedAt > HISTORY_TTL_MS;
}

export function getExtractionHistory(): ExtractionHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validItems = (parsed as ExtractionHistoryItem[])
      .filter((item) => !isHistoryExpired(item))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_HISTORY_ITEMS);

    if (validItems.length !== parsed.length) {
      saveExtractionHistory(validItems);
    }

    return validItems;
  } catch (error) {
    console.error("[Extraction History] Gagal membaca localStorage:", error);

    return [];
  }
}

function saveExtractionHistory(items: ExtractionHistoryItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("[Extraction History] Gagal menyimpan localStorage:", error);
  }
}

export function upsertExtractionHistory(item: ExtractionHistoryItem): ExtractionHistoryItem[] {
  const currentItems = getExtractionHistory();

  const existingIndex = currentItems.findIndex((historyItem) => historyItem.id === item.id);

  let nextItems: ExtractionHistoryItem[];

  if (existingIndex >= 0) {
    nextItems = currentItems.map((historyItem, index) =>
      index === existingIndex ? { ...historyItem, ...item } : historyItem,
    );
  } else {
    nextItems = [item, ...currentItems];
  }

  // Buang item yang sudah lebih dari 12 jam.
  nextItems = nextItems.filter((historyItem) => !isHistoryExpired(historyItem));

  // Riwayat terbaru selalu berada di atas.
  nextItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Simpan maksimal 50 siswa terbaru.
  nextItems = nextItems.slice(0, MAX_HISTORY_ITEMS);

  saveExtractionHistory(nextItems);

  return nextItems;
}

export function removeExtractionHistory(id: string): ExtractionHistoryItem[] {
  const nextItems = getExtractionHistory().filter((item) => item.id !== id);

  saveExtractionHistory(nextItems);

  return nextItems;
}

export function clearExtractionHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("[Extraction History] Gagal menghapus localStorage:", error);
  }
}
