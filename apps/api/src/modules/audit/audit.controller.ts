import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SystemRole } from "@unicom/types";

@Controller("audit")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER)
  async getAuditLogs(
    @Query("limit") limit?: string,
    @Query("action") action?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.auditService.getAllLogs(parsedLimit, action);
  }
}
