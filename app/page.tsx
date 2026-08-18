"use client";

import { useState } from "react";
import UploadSection from "@/components/upload-section"; // Sesuaikan path alias "@" jika perlu (atau "../components/UploadSection")
import ResultAkta from "@/components/result-akta";
import ResultKk from "@/components/result-kk";
import SaveSection from "@/components/save-section";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [resultKk, setResultKk] = useState<any>(null);
  const [resultAkta, setResultAkta] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prevFiles) => {
        const existingNames = new Set(prevFiles.map((f) => f.name));
        const uniqueNewFiles = newFiles.filter((f) => !existingNames.has(f.name));
        return [...prevFiles, ...uniqueNewFiles];
      });
      setResultKk(null);
      setResultAkta(null);
      setErrorMsg("");
      setSaveMessage("");
      e.target.value = "";
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setIsExtracting(true);
    setErrorMsg("");
    setResultKk(null);
    setResultAkta(null);
    setSaveMessage("");

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const fileName = file.name.toLowerCase();
        
        let endpoint = "/api/extract-kk"; 
        let type = "kk";
        if (fileName.includes("akta")) { endpoint = "/api/extract-akta"; type = "akta"; }

        const response = await fetch(endpoint, { method: "POST", body: formData });
        const data = await response.json();

        if (data.status === "success") return { type, data: data.data };
        throw new Error(`Gagal mengekstrak ${file.name}: ${data.message}`);
      });

      const results = await Promise.all(uploadPromises);
      results.forEach(res => {
        if (res.type === "akta") setResultAkta(res.data);
        if (res.type === "kk") setResultKk(res.data);
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses dokumen.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSendToSheet = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const response = await fetch("/api/update-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedData: resultKk,
          aktaData: resultAkta,
          fileName: files[0] ? files[0].name : "" 
        }),
      });

      const data = await response.json();
      if (data.success) setSaveMessage("Sukses! Data siswa berhasil disinkronkan.");
      else setSaveMessage("Gagal: " + (data.message || data.error));
    } catch (err) {
      setSaveMessage("Terjadi kesalahan jaringan saat mengirim ke Google Sheet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen p-10 flex flex-col items-center bg-gray-50 text-gray-800 font-sans">
      <h1 className="text-3xl font-bold mb-2 text-center text-blue-900">Ekstraksi Dokumen Siswa AI</h1>
      <p className="text-gray-500 mb-8 text-center max-w-xl">
        Bisa upload satu per satu atau sekaligus. <br/>
        <b>Tips:</b> Beri nama file akta dengan kata <i>"akta"</i>.
      </p>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-6xl">
        
        {/* Render Komponen Terpisah */}
        <UploadSection 
          files={files}
          isExtracting={isExtracting}
          errorMsg={errorMsg}
          onFileChange={handleFileChange}
          onRemoveFile={handleRemoveFile}
          onSubmit={handleSubmit}
        />

        <ResultAkta data={resultAkta} />
        
        <ResultKk data={resultKk} />

        <SaveSection 
          saving={saving}
          saveMessage={saveMessage}
          onSave={handleSendToSheet}
          hasData={!!resultKk || !!resultAkta}
        />

      </div>
    </main>
  );
}