import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { KnowledgeQueryResponse, KnowledgeCitation } from "@unicom/types";

@Injectable()
export class AssistantService {
  constructor(private databaseService: DatabaseService) {}

  async queryKnowledge(dto: {
    query: string;
    brandId?: string;
    userId?: string;
  }): Promise<KnowledgeQueryResponse> {
    const rawQuery = dto.query.trim().toLowerCase();
    const tokens = rawQuery.split(/\s+/).filter((t) => t.length > 2);

    // Search knowledgeBase corpus
    let candidates = this.databaseService.knowledgeBase;
    if (dto.brandId && dto.brandId !== "ALL") {
      candidates = candidates.filter((k) => k.brandId === dto.brandId);
    }

    const matches: Array<{
      item: (typeof candidates)[0];
      score: number;
    }> = [];

    for (const item of candidates) {
      let score = 0;
      const haystack = (
        item.title +
        " " +
        item.content +
        " " +
        item.snippet +
        " " +
        item.brandName
      ).toLowerCase();

      for (const token of tokens) {
        const wordRegex = new RegExp(`\\b${token}\\b`, "i");
        if (wordRegex.test(haystack)) {
          score += 1;
        }
      }

      if (score >= 2) {
        matches.push({ item, score });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return {
        query: dto.query,
        answer:
          "Mohon maaf, informasi mengenai pertanyaan tersebut tidak ditemukan dalam dokumen SOP & panduan resmi yang disetujui. Silakan konsultasikan langsung dengan Trainer Senior atau Supervisor cabang Anda.",
        confidence: 0.2,
        citations: [],
        hasSufficientSources: false,
        suggestedFollowUps: [
          "Berapa lama masa garansi smartphone Xiaomi?",
          "Bagaimana cara kalibrasi optical fingerprint?",
          "Apa langkah troubleshooting navigasi Ecovacs Deebot?",
        ],
        answeredAt: new Date().toISOString(),
      };
    }

    const topMatches = matches.slice(0, 2);
    const citations: KnowledgeCitation[] = topMatches.map((m) => ({
      documentName: m.item.title,
      pageNumber: m.item.pageNumber,
      snippet: m.item.snippet,
    }));

    // Synthesize grounded answer
    const primary = topMatches[0]!.item;
    const answer = `Berdasarkan **${primary.title}** (Hal. ${primary.pageNumber || "1"}):\n\n${primary.content}\n\n*Catatan: Pastikan seluruh prosedur keselamatan kerja dan standar operasional resmi UNICOM selalu diterapkan.*`;

    return {
      query: dto.query,
      answer,
      confidence: 0.95,
      citations,
      hasSufficientSources: true,
      suggestedFollowUps: [
        "Bagaimana prosedur klaim jika segel baut rusak?",
        "Di mana mengunduh firmware resmi Unicom?",
      ],
      answeredAt: new Date().toISOString(),
    };
  }
}
