import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { PracticalEvaluation } from "@unicom/types";

@Injectable()
export class EvaluationService {
  constructor(private databaseService: DatabaseService) {}

  async getUserEvaluations(userId: string): Promise<PracticalEvaluation[]> {
    return this.databaseService.practicalEvaluations.filter((p) => p.userId === userId);
  }

  async submitPracticalEvaluation(dto: {
    userId: string;
    trainerId: string;
    courseId: string;
    esdScore: number;
    disassemblyScore: number;
    diagnosisScore: number;
    documentationScore: number;
    trainerNotes: string;
  }): Promise<PracticalEvaluation> {
    const user = this.databaseService.users.find((u) => u.id === dto.userId);
    if (!user) throw new NotFoundException("Pengguna tidak ditemukan.");

    const trainer = this.databaseService.users.find((u) => u.id === dto.trainerId);
    const course = this.databaseService.courses.find((c) => c.id === dto.courseId);

    // Calculate weighted score: ESD (20%) + Disassembly (30%) + Diagnosis (30%) + Documentation (20%)
    const totalScore = Math.round(
      (dto.esdScore * 0.2 +
        dto.disassemblyScore * 0.3 +
        dto.diagnosisScore * 0.3 +
        dto.documentationScore * 0.2) *
        10,
    ) / 10;

    const evaluation: PracticalEvaluation = {
      id: `peval-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userNik: user.nik,
      trainerId: trainer?.id || "usr-trainer-1",
      trainerName: trainer?.name || "Senior Trainer",
      courseId: dto.courseId,
      courseTitle: course?.title || "Modul Praktikum",
      esdScore: dto.esdScore,
      disassemblyScore: dto.disassemblyScore,
      diagnosisScore: dto.diagnosisScore,
      documentationScore: dto.documentationScore,
      totalScore,
      trainerNotes: dto.trainerNotes,
      evaluatedAt: new Date().toISOString(),
    };

    this.databaseService.practicalEvaluations.unshift(evaluation);

    // Audit Event
    this.databaseService.logAudit({
      actorId: trainer?.id,
      actorEmail: trainer?.email,
      actorRole: trainer?.role,
      action: "PRACTICAL_EVALUATED",
      resource: "EVALUATION",
      resourceId: evaluation.id,
      details: { userId: user.id, totalScore },
    });

    return evaluation;
  }
}
