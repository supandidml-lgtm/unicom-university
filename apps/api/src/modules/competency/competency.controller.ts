import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { CompetencyService } from "./competency.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SystemRole } from "@unicom/types";

@Controller("competency")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompetencyController {
  constructor(private readonly competencyService: CompetencyService) {}

  @Get("profile/:userId")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR, SystemRole.STAFF)
  async getUserProfile(@Param("userId") userId: string) {
    return this.competencyService.getUserCompetencyProfile(userId);
  }

  @Get("passport/:userIdOrNik")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR, SystemRole.STAFF)
  async getPassport(@Param("userIdOrNik") userIdOrNik: string) {
    return this.competencyService.getLearningPassport(userIdOrNik);
  }

  @Get("matrix")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR)
  async getSkillMatrix(@Query("branchId") branchId?: string) {
    return this.competencyService.getMatrix(branchId);
  }
}
