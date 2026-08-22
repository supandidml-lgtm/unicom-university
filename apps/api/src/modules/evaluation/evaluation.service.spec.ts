import { describe, it, expect, beforeEach } from "vitest";
import { EvaluationService } from "./evaluation.service";
import { DatabaseService } from "../../database/database.service";

describe("EvaluationService (V1.1 Trainer Practical Assessment)", () => {
  let service: EvaluationService;
  let db: DatabaseService;

  beforeEach(async () => {
    db = new DatabaseService();
    await db.seedInitialDatabase();
    service = new EvaluationService(db);
  });

  it("should retrieve practical evaluations for a user", async () => {
    const evals = await service.getUserEvaluations("usr-staff-1");
    expect(evals.length).toBeGreaterThan(0);
    expect(evals[0]?.trainerName).toBe("Budi Santoso");
    expect(evals[0]?.totalScore).toBe(91.2);
  });

  it("should calculate weighted total score correctly (ESD 20%, Disassembly 30%, Diagnosis 30%, Documentation 20%)", async () => {
    const result = await service.submitPracticalEvaluation({
      userId: "usr-staff-1",
      trainerId: "usr-trainer-1",
      courseId: "course-1",
      esdScore: 100, // 20
      disassemblyScore: 90, // 27
      diagnosisScore: 80, // 24
      documentationScore: 90, // 18
      trainerNotes: "Sangat baik dalam pematuhan ESD.",
    });

    // 20 + 27 + 24 + 18 = 89.0
    expect(result.totalScore).toBe(89.0);
    expect(result.trainerNotes).toBe("Sangat baik dalam pematuhan ESD.");
  });
});
