import { GoogleGenAI } from "@google/genai";

import { PROMPT_EKSTRAKSI_KK } from "@/lib/prompts/kk-prompt";
import { parseDataFromNik } from "@/lib/nik-parser";
import { KkResultSchema } from "@/lib/validation/kk-schema";

import type { KkResult } from "@/types/kk";

const MODELS_TO_TRY = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
] as const;

interface ExtractionResult {
    data: KkResult;
    modelUsed: string;
}

export async function extractKkDocument(
    file: File
): Promise<ExtractionResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error(
            "Konfigurasi GEMINI_API_KEY belum tersedia."
        );
    }

    if (!(file instanceof File)) {
        throw new Error(
            "File KK tidak ditemukan."
        );
    }

    if (file.size === 0) {
        throw new Error(
            "File KK kosong."
        );
    }

    if (file.type !== "application/pdf") {
        throw new Error(
            "Dokumen KK harus berupa file PDF."
        );
    }

    const ai = new GoogleGenAI({
        apiKey,
    });

    const arrayBuffer = await file.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    const base64Data =
        buffer.toString("base64");

    let lastError: unknown = null;

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(
                `[KK Extraction] Mencoba model: ${modelName}`
            );

            const response =
                await ai.models.generateContent({
                    model: modelName,

                    contents: [
                        {
                            text: PROMPT_EKSTRAKSI_KK,
                        },
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: "application/pdf",
                            },
                        },
                    ],

                    config: {
                        responseMimeType:
                            "application/json",

                        responseSchema: {
                            type: "object",

                            properties: {
                                no_kk: {
                                    type: "string",
                                },

                                alamat: {
                                    type: "string",
                                },

                                rt: {
                                    type: "string",
                                },

                                rw: {
                                    type: "string",
                                },

                                kelurahan: {
                                    type: "string",
                                },

                                kecamatan: {
                                    type: "string",
                                },

                                kabupaten_kota: {
                                    type: "string",
                                },

                                provinsi: {
                                    type: "string",
                                },

                                kode_pos: {
                                    type: "string",
                                },

                                tanggal_dikeluarkan: {
                                    type: "string",
                                },

                                anggota_keluarga: {
                                    type: "array",

                                    items: {
                                        type: "object",

                                        properties: {
                                            nama_lengkap: {
                                                type: "string",
                                            },

                                            nik: {
                                                type: "string",
                                            },

                                            tempat_lahir: {
                                                type: "string",
                                            },

                                            agama: {
                                                type: "string",
                                            },

                                            pendidikan: {
                                                type: "string",
                                            },

                                            jenis_pekerjaan: {
                                                type: "string",
                                            },

                                            golongan_darah: {
                                                type: "string",
                                            },

                                            status_hubungan_dalam_keluarga: {
                                                type: "string",
                                            },

                                            nama_ayah: {
                                                type: "string",
                                            },

                                            nama_ibu: {
                                                type: "string",
                                            },
                                        },

                                        required: [
                                            "nama_lengkap",
                                            "nik",
                                            "tempat_lahir",
                                            "agama",
                                            "pendidikan",
                                            "jenis_pekerjaan",
                                            "golongan_darah",
                                            "status_hubungan_dalam_keluarga",
                                            "nama_ayah",
                                            "nama_ibu",
                                        ],
                                    },
                                },
                            },

                            required: [
                                "no_kk",
                                "alamat",
                                "rt",
                                "rw",
                                "kelurahan",
                                "kecamatan",
                                "kabupaten_kota",
                                "provinsi",
                                "kode_pos",
                                "tanggal_dikeluarkan",
                                "anggota_keluarga",
                            ],
                        },
                    },
                });

            // =====================================================
            // 1. CEK RESPONSE DARI GEMINI
            // =====================================================

            if (!response.text) {
                throw new Error(
                    "Model tidak memberikan hasil ekstraksi."
                );
            }

            console.log(
                "\n========================================"
            );

            console.log(
                "[KK DEBUG] MODEL:",
                modelName
            );

            console.log(
                "[KK DEBUG] RAW RESPONSE GEMINI:"
            );

            console.log(
                response.text
            );

            console.log(
                "========================================\n"
            );

            // =====================================================
            // 2. PARSE JSON
            // =====================================================

            const parsed =
                JSON.parse(response.text);

            // =====================================================
            // 3. CEK GOLONGAN DARAH SEBELUM ZOD
            // =====================================================

            console.log(
                "[KK DEBUG] GOLONGAN DARAH RAW GEMINI:"
            );

            console.log(
                parsed.anggota_keluarga?.map(
                    (anggota: {
                        nama_lengkap?: string;
                        golongan_darah?: string;
                    }) => ({
                        nama:
                            anggota.nama_lengkap,
                        golongan_darah:
                            anggota.golongan_darah,
                    })
                )
            );

            // =====================================================
            // 4. VALIDASI DENGAN ZOD
            // =====================================================

            const validated =
                KkResultSchema.parse(parsed);

            // =====================================================
            // 5. CEK HASIL SETELAH ZOD
            // =====================================================

            console.log(
                "[KK DEBUG] GOLONGAN DARAH SETELAH ZOD:"
            );

            console.log(
                validated.anggota_keluarga.map(
                    (anggota) => ({
                        nama:
                            anggota.nama_lengkap,
                        golongan_darah:
                            anggota.golongan_darah,
                    })
                )
            );

            // =====================================================
            // 6. PROSES DATA NIK
            // =====================================================

            const anggotaKeluarga =
                validated.anggota_keluarga.map(
                    (anggota) => {
                        const nikData =
                            parseDataFromNik(
                                anggota.nik
                            );

                        return {
                            ...anggota,

                            jenis_kelamin:
                                nikData.jenis_kelamin,

                            tanggal_lahir:
                                nikData.tanggal_lahir,
                        };
                    }
                );

            // =====================================================
            // 7. CEK SETELAH PARSE NIK
            // =====================================================

            console.log(
                "[KK DEBUG] GOLONGAN DARAH SETELAH PARSE NIK:"
            );

            console.log(
                anggotaKeluarga.map(
                    (anggota) => ({
                        nama:
                            anggota.nama_lengkap,

                        golongan_darah:
                            anggota.golongan_darah,

                        jenis_kelamin:
                            anggota.jenis_kelamin,

                        tanggal_lahir:
                            anggota.tanggal_lahir,
                    })
                )
            );

            // =====================================================
            // 8. FINAL DATA
            // =====================================================

            const finalData: KkResult = {
                ...validated,

                anggota_keluarga:
                    anggotaKeluarga,
            };

            // =====================================================
            // 9. CEK FINAL DATA
            // =====================================================

            console.log(
                "[KK DEBUG] FINAL GOLONGAN DARAH:"
            );

            console.log(
                finalData.anggota_keluarga.map(
                    (anggota) => ({
                        nama:
                            anggota.nama_lengkap,

                        golongan_darah:
                            anggota.golongan_darah,
                    })
                )
            );

            console.log(
                `[KK Extraction] Berhasil menggunakan model: ${modelName}`
            );

            console.log(
                "========================================\n"
            );

            // =====================================================
            // 10. RETURN
            // =====================================================

            return {
                data: finalData,
                modelUsed: modelName,
            };

        } catch (error) {
            lastError = error;

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error";

            console.warn(
                `[KK Extraction] ${modelName} gagal: ${errorMessage}`
            );

            console.warn(
                `[KK Extraction] Mencoba fallback berikutnya...`
            );
        }
    }

    // =========================================================
    // SEMUA MODEL GAGAL
    // =========================================================

    const lastErrorMessage =
        lastError instanceof Error
            ? lastError.message
            : "Unknown extraction error";

    throw new Error(
        `Semua model AI gagal memproses dokumen. ${lastErrorMessage}`
    );
}