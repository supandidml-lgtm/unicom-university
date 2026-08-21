import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class StorageService {
  constructor(private databaseService: DatabaseService) {}

  async getSignedAccessUrl(fileKey: string, userId: string): Promise<{ url: string; expiresAt: string }> {
    // Verify file exists in database materials
    const material = this.databaseService.materials.find((m) => m.fileKey === fileKey);
    if (!material) {
      throw new NotFoundException("Asset materi tidak ditemukan.");
    }

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour token
    const token = Buffer.from(`${userId}:${fileKey}:${Date.now()}`).toString("base64url");
    const baseUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:4000/api/v1";

    return {
      url: `${baseUrl}/storage/stream/${fileKey}?token=${token}`,
      expiresAt,
    };
  }

  async getMaterialContent(materialId: string) {
    const material = this.databaseService.materials.find((m) => m.id === materialId);
    if (!material) throw new NotFoundException("Materi tidak ditemukan.");
    return {
      id: material.id,
      title: material.title,
      type: material.type,
      fileKey: material.fileKey,
      durationSeconds: material.durationSeconds,
      totalPages: material.totalPages,
      sourceText: material.sourceText || "",
    };
  }
}
