import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { SupervisorCoachingPlan, SkillCategory } from "@unicom/types";

export interface CreateCoachingPlanDto {
  userId: string;
  supervisorId: string;
  weakCompetency: SkillCategory;
  gapScore: number;
  coachingTopic: string;
  assignedTrainerId: string;
  targetDate: string;
  notes?: string;
}

export interface ReassessCoachingDto {
  planId: string;
  reassessmentScore: number; // 0-100
  notes?: string;
}

@Injectable()
export class CoachingService {
  constructor(private databaseService: DatabaseService) {}

  async createPlan(dto: CreateCoachingPlanDto): Promise<SupervisorCoachingPlan> {
    const user = this.databaseService.users.find((u) => u.id === dto.userId);
    if (!user) throw new NotFoundException("Peserta tidak ditemukan.");

    const supervisor = this.databaseService.users.find((u) => u.id === dto.supervisorId);
    if (!supervisor) throw new NotFoundException("Supervisor tidak ditemukan.");

    const trainer = this.databaseService.users.find((u) => u.id === dto.assignedTrainerId);
    if (!trainer) throw new NotFoundException("Trainer tidak ditemukan.");

    const branch = this.databaseService.branches.find((b) => b.id === user.branchId);

    const plan: SupervisorCoachingPlan = {
      id: `coach-plan-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userNik: user.nik,
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      branchId: user.branchId,
      branchName: branch?.name || "Service Center",
      weakCompetency: dto.weakCompetency,
      gapScore: dto.gapScore,
      coachingTopic: dto.coachingTopic,
      assignedTrainerId: trainer.id,
      assignedTrainerName: trainer.name,
      targetDate: dto.targetDate,
      status: "IN_PROGRESS",
      notes: dto.notes,
      createdAt: new Date().toISOString(),
    };

    this.databaseService.coachingPlans.unshift(plan);

    this.databaseService.logAudit({
      actorId: supervisor.id,
      actorEmail: supervisor.email,
      action: "COACHING_PLAN_CREATED",
      resource: "COACHING_PLAN",
      resourceId: plan.id,
      payload: { userId: user.id, topic: plan.coachingTopic },
    });

    return plan;
  }

  async getPlansByBranch(branchId?: string): Promise<SupervisorCoachingPlan[]> {
    if (branchId && branchId !== "ALL") {
      return this.databaseService.coachingPlans.filter((p) => p.branchId === branchId);
    }
    return this.databaseService.coachingPlans;
  }

  async getPlansByUser(userId: string): Promise<SupervisorCoachingPlan[]> {
    return this.databaseService.coachingPlans.filter((p) => p.userId === userId);
  }

  async reassess(dto: ReassessCoachingDto): Promise<SupervisorCoachingPlan> {
    const plan = this.databaseService.coachingPlans.find((p) => p.id === dto.planId);
    if (!plan) throw new NotFoundException("Rencana coaching tidak ditemukan.");

    if (dto.reassessmentScore < 0 || dto.reassessmentScore > 100) {
      throw new BadRequestException("Nilai asesmen ulang harus berada dalam rentang 0 - 100.");
    }

    plan.status = dto.reassessmentScore >= 75 ? "COMPLETED" : "REASSESSED";
    plan.reassessmentScore = dto.reassessmentScore;
    if (dto.notes) plan.notes = dto.notes;

    // Update Skill Matrix entry for the trainee
    const skillEntry = this.databaseService.skillMatrix.find(
      (s) => s.userId === plan.userId && s.category === plan.weakCompetency,
    );
    if (skillEntry) {
      skillEntry.score = dto.reassessmentScore;
      skillEntry.lastCalculatedAt = new Date().toISOString();
    }

    this.databaseService.logAudit({
      actorId: plan.assignedTrainerId,
      actorEmail: "trainer@unicom.co.id",
      action: "COACHING_REASSESSED",
      resource: "COACHING_PLAN",
      resourceId: plan.id,
      payload: { score: dto.reassessmentScore, status: plan.status },
    });

    return plan;
  }
}
