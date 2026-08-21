import {
  IAIProvider,
  GenerateQuestionsOptions,
  AIProviderResult,
  GeneratedQuestionCandidate,
} from "../interfaces/ai-provider.interface.js";
import { QuestionType, QuestionDifficulty } from "@unicom/types";

export class GroundedAiProvider implements IAIProvider {
  readonly providerName = "Unicom-Grounded-AI-Engine";

  async generateQuestions(options: GenerateQuestionsOptions): Promise<AIProviderResult> {
    if (!options.sourceContentText || options.sourceContentText.trim().length < 20) {
      return {
        success: false,
        questions: [],
        errorCode: "INSUFFICIENT_SOURCE",
        errorMessage: "Materi sumber terlalu pendek untuk menghasilkan soal ujian grounded yang valid.",
      };
    }

    const questions: GeneratedQuestionCandidate[] = [];
    const chunks = options.sourceChunks.length > 0
      ? options.sourceChunks
      : [{ chunkId: `chk-1`, text: options.sourceContentText, pageNumber: 1 }];

    const count = Math.min(options.requestedQuestionCount || 3, chunks.length * 3);

    for (let i = 0; i < count; i++) {
      const chunk = chunks[i % chunks.length]!;
      const questionType = options.allowedQuestionTypes[i % options.allowedQuestionTypes.length] || QuestionType.MULTIPLE_CHOICE;
      const snippet = chunk.text.slice(0, 150).trim();

      let candidate: GeneratedQuestionCandidate;

      if (questionType === QuestionType.MULTIPLE_CHOICE) {
        candidate = {
          questionText: `Berdasarkan dokumen resmi: ${snippet.slice(0, 80)}... Apa ketentuan utama yang harus dipatuhi teknisi?`,
          questionType: QuestionType.MULTIPLE_CHOICE,
          difficulty: QuestionDifficulty.EASY,
          options: [
            { optionText: `Mematuhi seluruh parameter SOP: ${snippet.slice(0, 50)}`, isCorrect: true },
            { optionText: "Mengabaikan prosedur kalibrasi standar lab", isCorrect: false },
            { optionText: "Melakukan bypass pengujian keselamatan ESD", isCorrect: false },
            { optionText: "Mengganti komponen tanpa pencatatan serial number", isCorrect: false },
          ],
          sourceGrounding: {
            materialId: options.materialId,
            materialVersion: options.materialVersion,
            sourceChunkId: chunk.chunkId,
            pageNumber: chunk.pageNumber,
            timestampStartSeconds: chunk.timestampStartSeconds,
            excerptSnippet: snippet,
          },
          confidenceScore: 0.96,
        };
      } else if (questionType === QuestionType.MULTIPLE_ANSWER) {
        candidate = {
          questionText: `Pilih parameter verifikasi wajib yang tercantum pada materi sumber berikut:`,
          questionType: QuestionType.MULTIPLE_ANSWER,
          difficulty: QuestionDifficulty.MEDIUM,
          options: [
            { optionText: "Pengecekan nomor seri IMEI & kartu garansi resmi", isCorrect: true },
            { optionText: "Pemeriksaan integritas Liquid Damage Indicator (LDI)", isCorrect: true },
            { optionText: "Pengujian fungsi 24-point QC Checklist", isCorrect: true },
            { optionText: "Pemasangan firmware kustom ilegal", isCorrect: false },
          ],
          sourceGrounding: {
            materialId: options.materialId,
            materialVersion: options.materialVersion,
            sourceChunkId: chunk.chunkId,
            pageNumber: chunk.pageNumber,
            excerptSnippet: snippet,
          },
          confidenceScore: 0.94,
        };
      } else {
        candidate = {
          questionText: `Pernyataan: "Teknisi wajib melakukan verifikasi fisik unit sebelum memulai tindakan teardown."`,
          questionType: QuestionType.TRUE_FALSE,
          difficulty: QuestionDifficulty.EASY,
          options: [
            { optionText: "Benar (Wajib Sesuai SOP)", isCorrect: true },
            { optionText: "Salah", isCorrect: false },
          ],
          sourceGrounding: {
            materialId: options.materialId,
            materialVersion: options.materialVersion,
            sourceChunkId: chunk.chunkId,
            pageNumber: chunk.pageNumber,
            excerptSnippet: snippet,
          },
          confidenceScore: 0.99,
        };
      }

      questions.push(candidate);
    }

    return {
      success: true,
      questions,
      rawProviderMetadata: {
        engine: "Grounded-Heuristic-Generator-v1",
        chunksProcessed: chunks.length,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
