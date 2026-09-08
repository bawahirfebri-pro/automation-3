import { useState } from "react";

interface UseDocumentFilesReturn {
  files: File[];
  handleFileChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  handleRemoveFile: (
    indexToRemove: number
  ) => void;
  clearFiles: () => void;
  replaceFiles: (
    files: File[]
  ) => void;
}

function getFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function uniqueFiles(files: File[]): File[] {
  const seen = new Set<string>();

  return files.filter((file) => {
    const key = getFileKey(file);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

export function useDocumentFiles(): UseDocumentFilesReturn {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles =
      event.target.files;

    if (!selectedFiles?.length) return;

    const newFiles =
      Array.from(selectedFiles);

    setFiles((previousFiles) =>
      uniqueFiles([
        ...previousFiles,
        ...newFiles,
      ])
    );

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
  };

  const replaceFiles = (
    nextFiles: File[]
  ) => {
    setFiles(
      uniqueFiles(nextFiles)
    );
  };

  return {
    files,
    handleFileChange,
    handleRemoveFile,
    clearFiles,
    replaceFiles,
  };
}