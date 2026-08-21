import { describe, it, expect } from "vitest";
import { GroundedAiProvider } from "../src/providers/grounded-ai.provider.js";
import { MediaChunkingService } from "../src/services/media-chunking.service.js";
import { QuestionType } from "@unicom/types";

describe("Grounded AI Question Generation & Media Chunking (PRD §55–§64)", () => {
  it("should chunk long material text with token boundaries and overlap", () => {
    const chunker = new MediaChunkingService();
    const sampleText = Array.from({ length: 250 }, (_, i) => `kata-${i + 1}`).join(" ");

    const chunks = chunker.chunkText("mat-101", sampleText, {
      chunkSizeWords: 80,
      overlapWords: 15,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.chunkId).toContain("mat-101");
    expect(chunks[0]!.tokenCount).toBe(80);
  });

  it("should generate grounded questions with source snippet citations", async () => {
    const aiProvider = new GroundedAiProvider();
    const res = await aiProvider.generateQuestions({
      materialId: "mat-v-101",
      materialVersion: 1,
      materialType: "VIDEO",
      sourceContentText:
        "Standar operasional penerimaan unit mewajibkan teknisi melakukan pemeriksaan visual 360 derajat. Foto seluruh goresan atau dent pada body unit. Cocokkan IMEI pada baki SIM dengan kartu garansi resmi.",
      sourceChunks: [
        {
          chunkId: "chk-1",
          text: "Standar operasional penerimaan unit mewajibkan teknisi melakukan pemeriksaan visual 360 derajat.",
          pageNumber: 1,
        },
      ],
      requestedQuestionCount: 3,
      allowedQuestionTypes: [
        QuestionType.MULTIPLE_CHOICE,
        QuestionType.MULTIPLE_ANSWER,
        QuestionType.TRUE_FALSE,
      ],
    });

    expect(res.success).toBe(true);
    expect(res.questions.length).toBe(3);
    res.questions.forEach((q) => {
      expect(q.sourceGrounding.excerptSnippet).toBeDefined();
      expect(q.sourceGrounding.materialId).toBe("mat-v-101");
      expect(q.confidenceScore).toBeGreaterThan(0.9);
    });
  });

  it("should fail gracefully when source text is insufficient", async () => {
    const aiProvider = new GroundedAiProvider();
    const res = await aiProvider.generateQuestions({
      materialId: "mat-empty",
      materialVersion: 1,
      materialType: "PDF",
      sourceContentText: "Terlalu pendek",
      sourceChunks: [],
      requestedQuestionCount: 3,
      allowedQuestionTypes: [QuestionType.MULTIPLE_CHOICE],
    });

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("INSUFFICIENT_SOURCE");
  });
});
