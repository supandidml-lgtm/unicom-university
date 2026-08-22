import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { EvaluationService } from "./evaluation.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SystemRole } from "@unicom/types";

@Controller("evaluations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get("user/:userId")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR, SystemRole.STAFF)
  async getUserEvaluations(@Param("userId") userId: string) {
    return this.evaluationService.getUserEvaluations(userId);
  }

  @Post("practical")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER)
  async submitPractical(
    @Body()
    body: {
      userId: string;
      courseId: string;
      esdScore: number;
      disassemblyScore: number;
      diagnosisScore: number;
      documentationScore: number;
      trainerNotes: string;
    },
    @CurrentUser("sub") trainerId: string,
  ) {
    return this.evaluationService.submitPracticalEvaluation({
      ...body,
      trainerId,
    });
  }
}
