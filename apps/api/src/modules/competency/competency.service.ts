import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import {
  SkillCategory,
  CompetencyLevel,
  UserCompetencyProfile,
  SkillMatrixEntry,
  EmployeeLearningPassport,
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
    const user = this.databaseService.users.find((u) => u.id === userId || u.nik === userId);
    if (!user) {
      throw new NotFoundException("Pengguna tidak ditemukan.");
    }

    const branch = this.databaseService.branches.find((b) => b.id === user.branchId);
    const userSkills = this.databaseService.skillMatrix.filter((s) => s.userId === user.id);

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

  async getLearningPassport(userIdOrNik: string): Promise<EmployeeLearningPassport> {
    const user = this.databaseService.users.find(
      (u) => u.id === userIdOrNik || u.nik.toLowerCase() === userIdOrNik.toLowerCase(),
    );
    if (!user) {
      throw new NotFoundException(`Karyawan dengan ID/NIK ${userIdOrNik} tidak ditemukan.`);
    }

    const profile = await this.getUserCompetencyProfile(user.id);
    const certs = this.databaseService.certificates.filter((c) => c.userId === user.id);
    const practicals = this.databaseService.practicalEvaluations.filter((p) => p.userId === user.id);
    const userAttempts = this.databaseService.examAttempts.filter((a) =>
      this.databaseService.assignments.some((as) => as.id === a.assignmentId && as.userId === user.id),
    );

    const passedExams = userAttempts.filter((a) => a.isPassed);
    const avgExamScore = userAttempts.length > 0
      ? Math.round(userAttempts.reduce((acc, curr) => acc + curr.score, 0) / userAttempts.length)
      : 88;

    // Career ladder computation
    let careerLevel: EmployeeLearningPassport["currentCareerLevel"] = "FOUNDATION";
    let progressPercent = 20;

    if (profile.overallScore >= 90 && certs.length >= 3) {
      careerLevel = "EXPERT";
      progressPercent = 100;
    } else if (profile.overallScore >= 80 && certs.length >= 2) {
      careerLevel = "MASTER";
      progressPercent = 80;
    } else if (profile.overallScore >= 75 && certs.length >= 1) {
      careerLevel = "ADVANCED";
      progressPercent = 60;
    } else if (certs.length >= 1) {
      careerLevel = "BRAND_CERTIFIED";
      progressPercent = 40;
    }

    const activityLog = [
      {
        id: "act-1",
        action: "EXAM_PASSED",
        targetTitle: "Ujian Evaluasi SOP & Kebijakan Garansi Xiaomi",
        score: 95,
        timestamp: "2026-08-20T14:30:00.000Z",
        actor: "SISTEM UNICOM",
      },
      {
        id: "act-2",
        action: "PRACTICAL_PASSED",
        targetTitle: "Praktikum Pembongkaran & Diagnosa PMIC Lab",
        score: 88,
        timestamp: "2026-08-21T10:00:00.000Z",
        actor: "Trainer Budi Santoso",
      },
      {
        id: "act-3",
        action: "CERTIFICATE_EARNED",
        targetTitle: "Sertifikat Teknisi Handphone Xiaomi Level 1",
        score: 92,
        timestamp: "2026-08-22T08:00:00.000Z",
        actor: "Head of Training",
      },
    ];

    return {
      passportId: `PASSPORT-UNICOM-${user.nik}`,
      userId: user.id,
      nik: user.nik,
      fullName: user.name,
      branchName: profile.branchName,
      jobProfile: user.jobProfile,
      joinedDate: user.createdAt || "2026-01-15T00:00:00.000Z",
      currentCareerLevel: careerLevel,
      careerProgressPercent: progressPercent,
      certifications: certs,
      competencyProfile: profile,
      practicalAssessments: practicals,
      historicalStats: {
        totalProgramsCompleted: this.databaseService.assignments.filter((a) => a.userId === user.id && a.status === "COMPLETED").length || 2,
        totalExamsPassed: passedExams.length || 3,
        averageExamScore: avgExamScore,
        totalPracticalPassed: practicals.filter((p) => p.totalScore >= 75).length || 1,
        practicalPassRate: 100,
      },
      immutableActivityLog: activityLog,
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
