import { describe, it, expect, beforeEach } from "vitest";
import { AssistantService } from "./assistant.service";
import { DatabaseService } from "../../database/database.service";

describe("AssistantService (V1.1 AI Knowledge Assistant - RAG Grounding)", () => {
  let service: AssistantService;
  let db: DatabaseService;

  beforeEach(async () => {
    db = new DatabaseService();
    await db.seedInitialDatabase();
    service = new AssistantService(db);
  });

  it("should answer warranty question with source citation and page number", async () => {
    const result = await service.queryKnowledge({
      query: "Berapa lama masa garansi smartphone Xiaomi?",
      brandId: "brand-xiaomi",
    });

    expect(result.hasSufficientSources).toBe(true);
    expect(result.answer).toContain("SOP Klaim Garansi Resmi Xiaomi Indonesia");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0]?.pageNumber).toBe(14);
  });

  it("should return courteous fallback message when source is not found", async () => {
    const result = await service.queryKnowledge({
      query: "Cara membuat roket ke bulan",
      brandId: "brand-xiaomi",
    });

    expect(result.hasSufficientSources).toBe(false);
    expect(result.citations.length).toBe(0);
    expect(result.answer).toContain("tidak ditemukan dalam dokumen SOP");
  });
});
