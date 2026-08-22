import { Controller, Get, UseGuards } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get("kpi")
  async getDashboardKPI(@CurrentUser() user: any) {
    return this.reportsService.getDashboardKPI(user.role, user.id, user.branchId);
  }

  @Get("export")
  async getExportData() {
    return this.reportsService.getExportData();
  }

  @Get("multi-branch")
  async getMultiBranchAnalytics() {
    return this.reportsService.getMultiBranchAnalytics();
  }
}
