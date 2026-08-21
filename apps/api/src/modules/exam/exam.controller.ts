import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ExamService, SubmitAnswerItem } from "./exam.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SystemRole } from "@unicom/types";
import { IsNotEmpty, IsString, IsArray, IsNumber, IsOptional } from "class-validator";

class StartAttemptDto {
  @IsNotEmpty() @IsString() assignmentId!: string;
}

class SubmitExamDto {
  @IsNotEmpty() @IsString() assignmentId!: string;
  @IsNotEmpty() @IsArray() answers!: SubmitAnswerItem[];
}

class GenerateAiExamDto {
  @IsNotEmpty() @IsString() materialId!: string;
  @IsOptional() @IsNumber() questionCount?: number;
}

@Controller("exams")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamController {
  constructor(private examService: ExamService) {}

  @Get(":id")
  async getExamDetails(@Param("id") id: string) {
    return this.examService.getExamDetails(id);
  }

  @Post(":id/start-attempt")
  @HttpCode(HttpStatus.OK)
  async startExamAttempt(
    @Param("id") examId: string,
    @Body() dto: StartAttemptDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.examService.startExamAttempt(examId, dto.assignmentId, userId);
  }

  @Post(":id/submit")
  @HttpCode(HttpStatus.OK)
  async submitExam(
    @Param("id") examId: string,
    @Body() dto: SubmitExamDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.examService.submitExam(examId, dto.assignmentId, userId, dto.answers);
  }

  @Post(":id/generate-ai")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER)
  async generateAiExam(
    @Param("id") examId: string,
    @Body() dto: GenerateAiExamDto,
    @CurrentUser("email") email: string,
  ) {
    return this.examService.generateGroundedQuestions(
      examId,
      dto.materialId,
      dto.questionCount || 3,
      email,
    );
  }
}
