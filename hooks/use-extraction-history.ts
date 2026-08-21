"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  clearExtractionHistory,
  getExtractionHistory,
  removeExtractionHistory,
  upsertExtractionHistory,
} from "@/lib/extraction-history";

import type { ExtractionHistoryItem } from "@/types/extraction-history";

interface UseExtractionHistoryReturn {
  history: ExtractionHistoryItem[];
  addOrUpdateHistory: (
    item: ExtractionHistoryItem
  ) => void;
  markAsSaved: (
    id: string
  ) => void;
  removeHistory: (
    id: string
  ) => void;
  clearHistory: () => void;
}

export function useExtractionHistory(): UseExtractionHistoryReturn {
  const [history, setHistory] =
    useState<ExtractionHistoryItem[]>([]);

  useEffect(() => {
    const storedHistory =
      getExtractionHistory();

    setHistory(storedHistory);
  }, []);

  const addOrUpdateHistory = useCallback(
    (
      item: ExtractionHistoryItem
    ) => {
      const nextItems =
        upsertExtractionHistory(
          item
        );

      setHistory(nextItems);
    },
    []
  );

  const markAsSaved = useCallback(
    (
      id: string
    ) => {
      const currentHistory =
        getExtractionHistory();

      const targetItem =
        currentHistory.find(
          (item) =>
            item.id === id
        );

      if (!targetItem) {
        return;
      }

      const nextItems =
        upsertExtractionHistory({
          ...targetItem,
          savedToSheetAt:
            new Date().toISOString(),
        });

      setHistory(nextItems);
    },
    []
  );

  const removeHistory = useCallback(
    (
      id: string
    ) => {
      const nextItems =
        removeExtractionHistory(
          id
        );

      setHistory(nextItems);
    },
    []
  );

  const clearHistory =
    useCallback(() => {
      clearExtractionHistory();
      setHistory([]);
    }, []);

  return {
    history,
    addOrUpdateHistory,
    markAsSaved,
    removeHistory,
    clearHistory,
  };
}