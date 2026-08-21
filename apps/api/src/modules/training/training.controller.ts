import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { TrainingService } from "./training.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SystemRole, JobProfile, MaterialType } from "@unicom/types";
import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, IsBoolean } from "class-validator";

class CreateProgramDto {
  @IsNotEmpty() @IsString() brandId!: string;
  @IsNotEmpty() @IsString() title!: string;
  @IsNotEmpty() @IsString() description!: string;
  @IsNotEmpty() @IsEnum(JobProfile) targetJobProfile!: JobProfile;
  @IsOptional() @IsNumber() numberOfWeeks?: number;
  @IsOptional() @IsBoolean() isSequential?: boolean;
}

class CreateAssignmentDto {
  @IsNotEmpty() @IsString() userId!: string;
  @IsNotEmpty() @IsString() programId!: string;
  @IsNotEmpty() @IsString() trainerId!: string;
  @IsNotEmpty() @IsString() startDate!: string;
  @IsNotEmpty() @IsString() deadlineDate!: string;
}

class AddMaterialDto {
  @IsNotEmpty() @IsString() title!: string;
  @IsNotEmpty() @IsEnum(MaterialType) type!: MaterialType;
  @IsNotEmpty() @IsString() fileKey!: string;
  @IsOptional() @IsNumber() durationSeconds?: number;
  @IsOptional() @IsNumber() totalPages?: number;
  @IsOptional() @IsString() sourceText?: string;
}

@Controller("training")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainingController {
  constructor(private trainingService: TrainingService) {}

  @Get("programs")
  async getPrograms(@Query("brandId") brandId?: string) {
    return this.trainingService.getPrograms(brandId);
  }

  @Get("programs/:id")
  async getProgramById(@Param("id") id: string) {
    return this.trainingService.getProgramById(id);
  }

  @Post("programs")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER)
  async createProgram(@Body() dto: CreateProgramDto, @CurrentUser("email") email: string) {
    return this.trainingService.createProgram(
      dto.brandId,
      dto.title,
      dto.description,
      dto.targetJobProfile,
      dto.numberOfWeeks || 4,
      dto.isSequential ?? true,
      email,
    );
  }

  @Get("assignments")
  async getAssignments(@CurrentUser() user: any) {
    return this.trainingService.getAssignments(user.role, user.id, user.branchId);
  }

  @Post("assignments")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER)
  async createAssignment(@Body() dto: CreateAssignmentDto, @CurrentUser("email") email: string) {
    return this.trainingService.createAssignment(
      dto.userId,
      dto.programId,
      dto.trainerId,
      dto.startDate,
      dto.deadlineDate,
      email,
    );
  }

  @Post("courses/:courseId/materials")
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER)
  async addMaterial(
    @Param("courseId") courseId: string,
    @Body() dto: AddMaterialDto,
    @CurrentUser("email") email: string,
  ) {
    return this.trainingService.addMaterial(
      courseId,
      dto.title,
      dto.type,
      dto.fileKey,
      dto.durationSeconds,
      dto.totalPages,
      dto.sourceText,
      email,
    );
  }
}
