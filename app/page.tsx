"use client";

import { useEffect, useMemo, useState } from "react";

import UploadSection from "@/components/upload-section";

import DashboardLayout from "@/components/dashboard/dashboard-layout";
import DashboardContent from "@/components/dashboard/dashboard-content";
import HistoryPanel from "@/components/dashboard/history-panel";
import KkSummary from "@/components/dashboard/kk-summary";
import KkMembers from "@/components/dashboard/kk-members";
import AktaPanel from "@/components/dashboard/akta-panel";

import { extractStudentNameFromFilename } from "@/lib/document-name";

import { useDocumentExtraction } from "@/hooks/use-document-extraction";
import { useDocumentFiles } from "@/hooks/use-document-files";
import { useSaveToSheet } from "@/hooks/use-save-to-sheet";
import { useExtractionHistory } from "@/hooks/use-extraction-history";

import type {
  ExtractionHistoryItem,
  HistorySaveStatus,
} from "@/types/extraction-history";

export default function Home() {
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [savingHistoryId, setSavingHistoryId] = useState("");

  const [historySaveStatus, setHistorySaveStatus] = useState<
    Record<string, HistorySaveStatus>
  >({});

  const [historySaveMessage, setHistorySaveMessage] = useState<
    Record<string, string>
  >({});

  const {
    isExtracting,
    resultKk,
    resultAkta,
    modelUsedKk,
    modelUsedAkta,
    errorMsg,
    extract,
    restore,
    reset,
  } = useDocumentExtraction();

  const {
    save,
    clearSaveMessage,
  } = useSaveToSheet();

  const {
    history,
    addOrUpdateHistory,
    markAsSaved,
    removeHistory,
    clearHistory,
  } = useExtractionHistory();

  const {
    files,
    handleFileChange,
    handleRemoveFile,
  } = useDocumentFiles({
    onStudentChange: () => {
      setSelectedHistoryId("");
      reset();
      clearSaveMessage();
    },
  });

  const studentName = useMemo(() => {
    if (files.length === 0) {
      return "";
    }

    return extractStudentNameFromFilename(
      files[0].name
    );
  }, [files]);

  const isViewingHistory =
    selectedHistoryId !== "";

  const activeHistoryId =
    selectedHistoryId || studentName;

  const pendingFiles = useMemo(() => {
    return files.filter((file) => {
      const fileName =
        file.name.toLowerCase();

      const isAkta =
        fileName.includes("akta");

      if (isAkta) {
        return !resultAkta;
      }

      return !resultKk;
    });
  }, [
    files,
    resultKk,
    resultAkta,
  ]);

  const hasPendingFiles =
    pendingFiles.length > 0;

  useEffect(() => {
    if (!studentName) {
      return;
    }

    if (!resultKk && !resultAkta) {
      return;
    }

    if (
      selectedHistoryId &&
      selectedHistoryId !== studentName
    ) {
      return;
    }

    addOrUpdateHistory({
      id: studentName,
      studentName,
      kk: resultKk,
      akta: resultAkta,
      modelUsedKk: modelUsedKk || "",
      modelUsedAkta: modelUsedAkta || "",
      updatedAt: new Date().toISOString(),
      savedToSheetAt: undefined,
    });
  }, [
    studentName,
    selectedHistoryId,
    resultKk,
    resultAkta,
    modelUsedKk,
    modelUsedAkta,
    addOrUpdateHistory,
  ]);

  useEffect(() => {
    if (files.length === 0) {
      return;
    }

    if (isExtracting) {
      return;
    }

    if (pendingFiles.length === 0) {
      return;
    }

    clearSaveMessage();

    void extract(
      pendingFiles
    );
  }, [
    files,
    pendingFiles,
    isExtracting,
    extract,
    clearSaveMessage,
  ]);

  const handleUploadFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (selectedHistoryId) {
      setSelectedHistoryId("");
      reset();
      clearSaveMessage();
    }

    handleFileChange(event);
  };

  const handleSelectHistory = (
    item: ExtractionHistoryItem
  ) => {
    setSelectedHistoryId(
      item.id
    );

    restore({
      kk: item.kk,
      akta: item.akta,
      modelUsedKk:
        item.modelUsedKk,
      modelUsedAkta:
        item.modelUsedAkta,
    });

    clearSaveMessage();
  };

  const handleBackToActiveFiles = () => {
    setSelectedHistoryId("");
    clearSaveMessage();

    const activeItem =
      history.find(
        (item) =>
          item.id === studentName
      );

    if (activeItem) {
      restore({
        kk: activeItem.kk,
        akta: activeItem.akta,
        modelUsedKk:
          activeItem.modelUsedKk,
        modelUsedAkta:
          activeItem.modelUsedAkta,
      });

      return;
    }

    reset();
  };

  const handleRemoveHistory = (
    id: string
  ) => {
    removeHistory(id);

    setHistorySaveStatus((previous) => {
      const next = {
        ...previous,
      };

      delete next[id];

      return next;
    });

    setHistorySaveMessage((previous) => {
      const next = {
        ...previous,
      };

      delete next[id];

      return next;
    });

    if (
      selectedHistoryId !== id
    ) {
      return;
    }

    setSelectedHistoryId("");
    clearSaveMessage();

    const activeItem =
      history.find(
        (item) =>
          item.id === studentName &&
          item.id !== id
      );

    if (activeItem) {
      restore({
        kk: activeItem.kk,
        akta: activeItem.akta,
        modelUsedKk:
          activeItem.modelUsedKk,
        modelUsedAkta:
          activeItem.modelUsedAkta,
      });

      return;
    }

    reset();
  };

  const handleClearHistory = () => {
    clearHistory();

    setSelectedHistoryId("");
    setSavingHistoryId("");
    setHistorySaveStatus({});
    setHistorySaveMessage({});

    clearSaveMessage();

    if (
      studentName &&
      (resultKk || resultAkta)
    ) {
      return;
    }

    reset();
  };

  const handleSaveHistoryItem = async (
    item: ExtractionHistoryItem
  ) => {
    if (savingHistoryId) {
      return;
    }

    if (!item.kk && !item.akta) {
      return;
    }

    setSavingHistoryId(
      item.id
    );

    setHistorySaveStatus((previous) => ({
      ...previous,
      [item.id]: "saving",
    }));

    setHistorySaveMessage((previous) => ({
      ...previous,
      [item.id]: "",
    }));

    const result = await save({
      extractedData: item.kk,
      aktaData: item.akta,
      fileName:
        `${item.studentName}_KK.pdf`,
    });

    if (result.success) {
      markAsSaved(
        item.id
      );

      setHistorySaveStatus((previous) => ({
        ...previous,
        [item.id]: "success",
      }));

      setHistorySaveMessage((previous) => ({
        ...previous,
        [item.id]: result.message,
      }));
    } else {
      setHistorySaveStatus((previous) => ({
        ...previous,
        [item.id]: "error",
      }));

      setHistorySaveMessage((previous) => ({
        ...previous,
        [item.id]: result.message,
      }));
    }

    setSavingHistoryId("");
  };

  useEffect(() => {
    if (!studentName) {
      return;
    }

    if (!resultKk && !resultAkta) {
      return;
    }

    setHistorySaveStatus((previous) => {
      if (!previous[studentName]) {
        return previous;
      }

      const next = {
        ...previous,
      };

      delete next[studentName];

      return next;
    });

    setHistorySaveMessage((previous) => {
      if (!previous[studentName]) {
        return previous;
      }

      const next = {
        ...previous,
      };

      delete next[studentName];

      return next;
    });
  }, [
    studentName,
    resultKk,
    resultAkta,
  ]);

  return (
    <DashboardLayout>
      <DashboardContent>
        <section className="col-span-12 h-full lg:col-span-6">
          <UploadSection
            files={files}
            isExtracting={isExtracting}
            errorMsg={errorMsg}
            hasKkResult={
              !isViewingHistory &&
              !!resultKk
            }
            hasAktaResult={
              !isViewingHistory &&
              !!resultAkta
            }
            hasPendingFiles={
              hasPendingFiles
            }
            onFileChange={
              handleUploadFileChange
            }
            onRemoveFile={
              handleRemoveFile
            }
          />
        </section>

        <HistoryPanel
          history={history}
          activeId={activeHistoryId}
          isViewingHistory={
            isViewingHistory
          }
          savingHistoryId={
            savingHistoryId
          }
          saveStatus={
            historySaveStatus
          }
          saveMessage={
            historySaveMessage
          }
          onSelect={
            handleSelectHistory
          }
          onRemove={
            handleRemoveHistory
          }
          onClear={
            handleClearHistory
          }
          onBackToActive={
            handleBackToActiveFiles
          }
          onSave={
            handleSaveHistoryItem
          }
        />

        <AktaPanel
          data={resultAkta}
          modelUsed={
            modelUsedAkta
          }
        />

        <KkSummary
          data={resultKk}
          modelUsed={
            modelUsedKk
          }
        />

        <KkMembers
          data={resultKk}
          studentName={
            activeHistoryId
          }
        />
      </DashboardContent>
    </DashboardLayout>
  );
}