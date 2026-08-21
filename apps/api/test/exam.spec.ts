import { describe, it, expect, beforeEach } from "vitest";
import { ExamService } from "../src/modules/exam/exam.service";
import { DatabaseService } from "../src/database/database.service";
import { ProgressService } from "../src/modules/progress/progress.service";
import { ExamStatus } from "@unicom/types";

describe("Exam & Auto-Grading Engine (PRD §55–§70)", () => {
  let examService: ExamService;
  let dbService: DatabaseService;
  let progressService: ProgressService;

  beforeEach(async () => {
    dbService = new DatabaseService();
    await dbService.onModuleInit();
    progressService = new ProgressService(dbService);
    examService = new ExamService(dbService, progressService);
  });

  it("should start exam attempt and sanitize question options", async () => {
    const session = await examService.startExamAttempt("exam-mi-week-2", "asg-andi-1", "usr-staff-1");
    expect(session.attemptId).toBeDefined();
    expect(session.questions.length).toBeGreaterThan(0);
    // Ensure no options contain isCorrect property in client payload
    session.questions.forEach((q) => {
      q.options.forEach((opt: any) => {
        expect(opt.isCorrect).toBeUndefined();
      });
    });
  });

  it("should auto-grade exam submission and evaluate passing score >= 80", async () => {
    const result = await examService.submitExam(
      "exam-mi-week-1",
      "asg-andi-1",
      "usr-staff-1",
      [
        { questionId: "q-mi-101", selectedOptionIds: ["opt-2"] },
        { questionId: "q-mi-102", selectedOptionIds: ["opt-21", "opt-22", "opt-24"] },
        { questionId: "q-mi-103", selectedOptionIds: ["opt-32"] },
      ],
    );

    expect(result.score).toBe(100);
    expect(result.isPassed).toBe(true);
    expect(result.correctCount).toBe(3);
  });
});
