import { describe, it, expect, beforeEach } from "vitest";
import { ReportsService } from "../src/modules/reports/reports.service";
import { DatabaseService } from "../src/database/database.service";
import { SystemRole } from "@unicom/types";

describe("Reports & KPI Analytics (PRD §80–§90)", () => {
  let reportsService: ReportsService;
  let dbService: DatabaseService;

  beforeEach(async () => {
    dbService = new DatabaseService();
    await dbService.onModuleInit();
    reportsService = new ReportsService(dbService);
  });

  it("should calculate Staff dashboard KPIs accurately", async () => {
    const kpi = await reportsService.getDashboardKPI(SystemRole.STAFF, "usr-staff-1");
    expect(kpi.role).toBe(SystemRole.STAFF);
    expect(kpi.stats.overallProgress).toBeGreaterThan(0);
    expect(kpi.stats.averageScore).toBeGreaterThan(0);
  });

  it("should calculate Super Admin global multi-brand KPIs", async () => {
    const kpi = await reportsService.getDashboardKPI(SystemRole.SUPER_ADMIN, "usr-admin-1");
    expect(kpi.role).toBe(SystemRole.SUPER_ADMIN);
    expect(kpi.stats.totalBrands).toBe(6);
    expect(kpi.branchBreakdown.length).toBeGreaterThan(0);
    expect(kpi.brandBreakdown.length).toBe(6);
  });

  it("should produce tabular export data", async () => {
    const data = await reportsService.getExportData();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]!.nik).toBeDefined();
    expect(data[0]!.program).toBeDefined();
  });
});
