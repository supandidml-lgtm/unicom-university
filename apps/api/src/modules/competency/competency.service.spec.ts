import { describe, it, expect, beforeEach } from "vitest";
import { CompetencyService } from "./competency.service";
import { DatabaseService } from "../../database/database.service";

describe("CompetencyService (V1.1 Skill Matrix)", () => {
  let service: CompetencyService;
  let db: DatabaseService;

  beforeEach(async () => {
    db = new DatabaseService();
    await db.seedInitialDatabase();
    service = new CompetencyService(db);
  });

  it("should calculate user competency profile with brand scores and overall level", async () => {
    const profile = await service.getUserCompetencyProfile("usr-staff-1");
    expect(profile).toBeDefined();
    expect(profile.userName).toContain("Andi Pratama");
    expect(profile.overallScore).toBeGreaterThan(0);
    expect(profile.brandScores.length).toBeGreaterThan(0);
    
    const xiaomiBrand = profile.brandScores.find((b) => b.brandName === "Xiaomi");
    expect(xiaomiBrand).toBeDefined();
    expect(xiaomiBrand?.categories.length).toBeGreaterThanOrEqual(4);
  });

  it("should return skill matrix filtered by branch", async () => {
    const matrix = await service.getMatrix("branch-jkt-pusat");
    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix.length).toBeGreaterThan(0);
  });
});
