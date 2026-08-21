import { describe, it, expect } from "vitest";
import {
  SystemRole,
  JobProfile,
  AccountStatus,
  TrainingAssignmentStatus,
  LearningStatus,
  ExamStatus,
  MaterialType,
  QuestionType,
} from "../src/index";

describe("Domain Types & Enums Integrity", () => {
  it("should have all required system roles defined per PRD §6", () => {
    expect(SystemRole.SUPER_ADMIN).toBe("SUPER_ADMIN");
    expect(SystemRole.TRAINER).toBe("TRAINER");
    expect(SystemRole.SUPERVISOR).toBe("SUPERVISOR");
    expect(SystemRole.STAFF).toBe("STAFF");
  });

  it("should have all required job profiles defined per PRD §7", () => {
    expect(JobProfile.ADMIN).toBe("ADMIN");
    expect(JobProfile.TECHNICIAN).toBe("TECHNICIAN");
    expect(JobProfile.CUSTOMER_SERVICE).toBe("CUSTOMER_SERVICE");
  });

  it("should have all required account statuses per PRD §14", () => {
    expect(AccountStatus.ACTIVE).toBe("ACTIVE");
    expect(AccountStatus.INACTIVE).toBe("INACTIVE");
    expect(AccountStatus.SUSPENDED).toBe("SUSPENDED");
    expect(AccountStatus.PENDING_ACTIVATION).toBe("PENDING_ACTIVATION");
  });

  it("should have all required training assignment statuses per PRD §23", () => {
    expect(TrainingAssignmentStatus.NOT_STARTED).toBe("NOT_STARTED");
    expect(TrainingAssignmentStatus.IN_PROGRESS).toBe("IN_PROGRESS");
    expect(TrainingAssignmentStatus.COMPLETED).toBe("COMPLETED");
    expect(TrainingAssignmentStatus.FAILED).toBe("FAILED");
    expect(TrainingAssignmentStatus.OVERDUE).toBe("OVERDUE");
    expect(TrainingAssignmentStatus.CANCELLED).toBe("CANCELLED");
  });

  it("should have learning and exam statuses per PRD §29", () => {
    expect(LearningStatus.LOCKED).toBe("LOCKED");
    expect(LearningStatus.COMPLETED).toBe("COMPLETED");
    expect(ExamStatus.LOCKED).toBe("LOCKED");
    expect(ExamStatus.PASSED).toBe("PASSED");
    expect(ExamStatus.FAILED).toBe("FAILED");
  });

  it("should have material and question types per PRD §26 & §58", () => {
    expect(MaterialType.VIDEO).toBe("VIDEO");
    expect(MaterialType.PDF).toBe("PDF");
    expect(QuestionType.MULTIPLE_CHOICE).toBe("MULTIPLE_CHOICE");
    expect(QuestionType.MULTIPLE_ANSWER).toBe("MULTIPLE_ANSWER");
    expect(QuestionType.TRUE_FALSE).toBe("TRUE_FALSE");
  });
});
