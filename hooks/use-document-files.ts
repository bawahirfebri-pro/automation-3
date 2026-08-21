import { useState } from "react";
import { extractStudentNameFromFilename } from "@/lib/document-name";

interface UseDocumentFilesOptions {
  onStudentChange?: () => void;
}

interface UseDocumentFilesReturn {
  files: File[];
  handleFileChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  handleRemoveFile: (indexToRemove: number) => void;
  clearFiles: () => void;
}

export function useDocumentFiles({
  onStudentChange,
}: UseDocumentFilesOptions = {}): UseDocumentFilesReturn {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files;

    if (!selectedFiles?.length) {
      return;
    }

    const newFiles = Array.from(selectedFiles);

    setFiles((previousFiles) => {
      if (previousFiles.length === 0) {
        return newFiles;
      }

      const existingStudentName =
        extractStudentNameFromFilename(
          previousFiles[0].name
        );

      const newStudentName =
        extractStudentNameFromFilename(
          newFiles[0].name
        );

      // Siswa berbeda → ganti seluruh dokumen dan reset hasil lama
      if (existingStudentName !== newStudentName) {
        onStudentChange?.();
        return newFiles;
      }

      // Siswa sama → pertahankan dokumen sebelumnya
      const existingNames = new Set(
        previousFiles.map((file) =>
          file.name.toLowerCase()
        )
      );

      const uniqueFiles = newFiles.filter(
        (file) =>
          !existingNames.has(
            file.name.toLowerCase()
          )
      );

      return [
        ...previousFiles,
        ...uniqueFiles,
      ];
    });

    event.target.value = "";
  };

  const handleRemoveFile = (
    indexToRemove: number
  ) => {
    setFiles((previousFiles) =>
      previousFiles.filter(
        (_, index) =>
          index !== indexToRemove
      )
    );
  };

  const clearFiles = () => {
    setFiles([]);
    onStudentChange?.();
  };

  return {
    files,
    handleFileChange,
    handleRemoveFile,
    clearFiles,
  };
}