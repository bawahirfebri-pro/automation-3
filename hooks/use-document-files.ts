import { useState } from "react";

interface UseDocumentFilesReturn {
  files: File[];
  handleFileChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  handleRemoveFile: (indexToRemove: number) => void;
  clearFiles: () => void;
}

function getFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function useDocumentFiles(): UseDocumentFilesReturn {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = event.target.files;

    if (!selectedFiles?.length) return;

    const newFiles = Array.from(selectedFiles);

    setFiles((previousFiles) => {
      const existingKeys = new Set(
        previousFiles.map((file) => getFileKey(file))
      );

      const uniqueFiles = newFiles.filter(
        (file) => !existingKeys.has(getFileKey(file))
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
        (_, index) => index !== indexToRemove
      )
    );
  };

  const clearFiles = () => {
    setFiles([]);
  };

  return {
    files,
    handleFileChange,
    handleRemoveFile,
    clearFiles,
  };
}