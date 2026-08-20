"use client";

import { useMemo } from "react";

import UploadSection from "@/components/upload-section";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import DashboardContent from "@/components/dashboard/dashboard-content";
import AktaPanel from "@/components/dashboard/akta-panel";
import KkPanel from "@/components/dashboard/kk-panel";
import SavePanel from "@/components/dashboard/save-panel";

import { validateKkResult } from "@/lib/validation/kk-validation";

import { useDocumentExtraction } from "@/hooks/use-document-extraction";
import { useDocumentFiles } from "@/hooks/use-document-files";
import { useSaveToSheet } from "@/hooks/use-save-to-sheet";

export default function Home() {
  // Extraction
  const {
    isExtracting,
    resultKk,
    resultAkta,
    modelUsedKk,
    errorMsg,
    extract,
    reset,
  } = useDocumentExtraction();

  // Save
  const {
    saving,
    saveMessage,
    save,
    clearSaveMessage,
  } = useSaveToSheet();

  // Files
  const {
    files,
    handleFileChange,
    handleRemoveFile,
  } = useDocumentFiles({
    onFilesChange: () => {
      reset();
      clearSaveMessage();
    },
  });

  // Validation
  const validationWarnings = useMemo(
    () => validateKkResult(resultKk),
    [resultKk]
  );

  // Extract
  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (files.length === 0 || isExtracting) {
      return;
    }

    clearSaveMessage();
    await extract(files);
  };

  // Save
  const handleSave = async () => {
    if (!resultKk && !resultAkta) {
      return;
    }

    await save({
      extractedData: resultKk,
      aktaData: resultAkta,
      fileName: files[0]?.name || "",
    });
  };

  return (
    <DashboardLayout>
      <DashboardContent>
        <section className="col-span-12 lg:col-span-6">
          <UploadSection
            files={files}
            isExtracting={isExtracting}
            errorMsg={errorMsg}
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
            onSubmit={handleSubmit}
          />
        </section>

        <AktaPanel data={resultAkta} />

        <KkPanel
          data={resultKk}
          modelUsed={modelUsedKk}
        />

        <SavePanel
          saving={saving}
          saveMessage={saveMessage}
          hasData={!!resultKk || !!resultAkta}
          warnings={validationWarnings}
          onSave={handleSave}
        />
      </DashboardContent>
    </DashboardLayout>
  );
}