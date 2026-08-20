import { useState } from "react";
import { extractStudentName } from "@/lib/utils/document";

interface UseDocumentFilesOptions {
  onFilesChange?: () => void;
}

interface UseDocumentFilesReturn {
  files: File[];
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (indexToRemove: number) => void;
  clearFiles: () => void;
}

export function useDocumentFiles({
  onFilesChange,
}: UseDocumentFilesOptions = {}): UseDocumentFilesReturn {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) return;

    const newFiles = Array.from(selectedFiles);
    let nextFiles = newFiles;

    if (files.length > 0) {
      const existingStudentName = extractStudentName(files[0].name);
      const newStudentName = extractStudentName(newFiles[0].name);

      if (existingStudentName === newStudentName) {
        const existingNames = new Set(files.map((file) => file.name));
        const uniqueFiles = newFiles.filter(
          (file) => !existingNames.has(file.name)
        );

        if (uniqueFiles.length === 0) {
          event.target.value = "";
          return;
        }

        nextFiles = [...files, ...uniqueFiles];
      }
    }

    setFiles(nextFiles);
    onFilesChange?.();
    event.target.value = "";
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((previousFiles) =>
      previousFiles.filter((_, index) => index !== indexToRemove)
    );
    onFilesChange?.();
  };

  const clearFiles = () => {
    if (files.length === 0) return;

    setFiles([]);
    onFilesChange?.();
  };

  return {
    files,
    handleFileChange,
    handleRemoveFile,
    clearFiles,
  };
}