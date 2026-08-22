import { describe, it, expect, beforeEach } from "vitest";
import { CoachingService } from "./coaching.service";
import { DatabaseService } from "../../database/database.service";
import { SkillCategory } from "@unicom/types";

describe("CoachingService (Supervisor Coaching & Reassessment)", () => {
  let service: CoachingService;
  let db: DatabaseService;

  beforeEach(async () => {
    db = new DatabaseService();
    await db.onModuleInit();
    service = new CoachingService(db);
  });

  it("should retrieve initial seeded coaching plans", async () => {
    const plans = await service.getPlansByBranch("ALL");
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0].userName).toBe("Andi Pratama");
  });

  it("should create a new coaching plan successfully", async () => {
    const plan = await service.createPlan({
      userId: "usr-staff-2",
      supervisorId: "usr-spv-1",
      weakCompetency: SkillCategory.HARDWARE,
      gapScore: 25,
      coachingTopic: "Bimbingan Solder BGA & Penggantian Flex Cable",
      assignedTrainerId: "usr-trainer-1",
      targetDate: "2026-09-30",
    });

    expect(plan.id).toBeDefined();
    expect(plan.status).toBe("IN_PROGRESS");
    expect(plan.userNik).toBe("UC10043");
  });

  it("should reassess coaching plan and update skill score on completion", async () => {
    const reassessed = await service.reassess({
      planId: "coach-plan-1",
      reassessmentScore: 88,
      notes: "Selesai bimbingan praktikum meja kerja. Nilai diagnosa meningkat.",
    });

    expect(reassessed.status).toBe("COMPLETED");
    expect(reassessed.reassessmentScore).toBe(88);
  });
});
