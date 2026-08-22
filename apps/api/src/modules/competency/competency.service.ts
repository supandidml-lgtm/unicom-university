import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  SkillCategory,
  CompetencyLevel,
  UserCompetencyProfile,
  SkillMatrixEntry,
} from "@unicom/types";

@Injectable()
export class CompetencyService {
  constructor(private databaseService: DatabaseService) {}

  private calculateLevel(score: number): CompetencyLevel {
    if (score >= 90) return CompetencyLevel.EXPERT;
    if (score >= 75) return CompetencyLevel.ADVANCED;
    if (score >= 60) return CompetencyLevel.INTERMEDIATE;
    return CompetencyLevel.BEGINNER;
  }

  async getUserCompetencyProfile(userId: string): Promise<UserCompetencyProfile> {
    const user = this.databaseService.users.find((u) => u.id === userId);
    if (!user) {
      throw new NotFoundException("Pengguna tidak ditemukan.");
    }

    const branch = this.databaseService.branches.find((b) => b.id === user.branchId);
    const userSkills = this.databaseService.skillMatrix.filter((s) => s.userId === userId);

    // Group by Brand
    const brandMap = new Map<string, { brandId: string; brandName: string; scores: number[]; categories: Array<{ category: SkillCategory; score: number }> }>();

    for (const skill of userSkills) {
      if (!brandMap.has(skill.brandId)) {
        brandMap.set(skill.brandId, {
          brandId: skill.brandId,
          brandName: skill.brandName,
          scores: [],
          categories: [],
        });
      }
      const entry = brandMap.get(skill.brandId)!;
      entry.scores.push(skill.score);
      entry.categories.push({
        category: skill.category,
        score: skill.score,
      });
    }

    const brandScores = Array.from(brandMap.values()).map((b) => {
      const avgScore = b.scores.length > 0 ? Math.round(b.scores.reduce((a, c) => a + c, 0) / b.scores.length) : 0;
      return {
        brandId: b.brandId,
        brandName: b.brandName,
        score: avgScore,
        level: this.calculateLevel(avgScore),
        categories: b.categories,
      };
    });

    const allScores = userSkills.map((s) => s.score);
    const overallScore = allScores.length > 0 ? Math.round(allScores.reduce((a, c) => a + c, 0) / allScores.length) : 0;

    return {
      userId: user.id,
      userName: user.name,
      userNik: user.nik,
      jobProfile: user.jobProfile,
      branchName: branch?.name || "Service Center",
      overallScore,
      overallLevel: this.calculateLevel(overallScore),
      brandScores,
    };
  }

  async getMatrix(branchId?: string): Promise<SkillMatrixEntry[]> {
    if (branchId && branchId !== "ALL") {
      const branchUserIds = this.databaseService.users
        .filter((u) => u.branchId === branchId)
        .map((u) => u.id);
      return this.databaseService.skillMatrix.filter((s) => branchUserIds.includes(s.userId));
    }
    return this.databaseService.skillMatrix;
  }
}
