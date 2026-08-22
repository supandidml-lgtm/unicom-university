import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { CoachingService, CreateCoachingPlanDto, ReassessCoachingDto } from "./coaching.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SystemRole } from "@unicom/types";

@Controller("coaching")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  @Post("plan")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.SUPERVISOR, SystemRole.TRAINER)
  async createPlan(@Body() body: CreateCoachingPlanDto) {
    return this.coachingService.createPlan(body);
  }

  @Get("branch/:branchId")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.SUPERVISOR, SystemRole.TRAINER)
  async getPlansByBranch(@Param("branchId") branchId: string) {
    return this.coachingService.getPlansByBranch(branchId);
  }

  @Get("user/:userId")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.SUPERVISOR, SystemRole.TRAINER, SystemRole.STAFF)
  async getPlansByUser(@Param("userId") userId: string) {
    return this.coachingService.getPlansByUser(userId);
  }

  @Post("reassess")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR)
  async reassess(@Body() body: ReassessCoachingDto) {
    return this.coachingService.reassess(body);
  }
}
