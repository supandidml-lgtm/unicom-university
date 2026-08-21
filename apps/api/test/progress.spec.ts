import { describe, it, expect, beforeEach } from "vitest";
import { ProgressService } from "../src/modules/progress/progress.service";
import { DatabaseService } from "../src/database/database.service";
import { LearningStatus } from "@unicom/types";
import { BadRequestException } from "@nestjs/common";

describe("Progress & Anti-Skip Engine (PRD §35–§50)", () => {
  let progressService: ProgressService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    dbService = new DatabaseService();
    await dbService.onModuleInit();
    progressService = new ProgressService(dbService);
  });

  it("should record video heartbeats and calculate unique coverage", async () => {
    const res = await progressService.recordVideoHeartbeat(
      {
        assignmentId: "asg-andi-1",
        materialId: "mat-v-101",
        currentPosition: 150,
        duration: 300,
        playbackSpeed: 1.0,
        isPlaying: true,
      },
      "usr-staff-1",
    );

    expect(res.materialId).toBe("mat-v-101");
    expect(typeof res.percentage).toBe("number");
  });

  it("should reject playback speed exceeding 2.0x limit per PRD §37", async () => {
    await expect(
      progressService.recordVideoHeartbeat(
        {
          assignmentId: "asg-andi-1",
          materialId: "mat-v-101",
          currentPosition: 50,
          duration: 300,
          playbackSpeed: 2.5,
          isPlaying: true,
        },
        "usr-staff-1",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("should complete PDF material when 100% pages are engaged", async () => {
    let res: any;
    for (let p = 1; p <= 5; p++) {
      res = await progressService.recordPdfProgress(
        {
          assignmentId: "asg-andi-1",
          materialId: "mat-p-101",
          pageNumber: p,
          totalPages: 5,
          activeReadingTimeSeconds: 5,
        },
        "usr-staff-1",
      );
    }

    expect(res.isCompleted).toBe(true);
    expect(res.status).toBe(LearningStatus.COMPLETED);
    expect(res.percentage).toBe(100);
  });
});
