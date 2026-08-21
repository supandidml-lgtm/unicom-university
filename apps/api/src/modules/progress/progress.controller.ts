import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ProgressService, VideoHeartbeatDto, PdfProgressDto } from "./progress.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { IsNotEmpty, IsString, IsNumber, IsBoolean } from "class-validator";

class VideoHeartbeatBody {
  @IsNotEmpty() @IsString() assignmentId!: string;
  @IsNotEmpty() @IsString() materialId!: string;
  @IsNotEmpty() @IsNumber() currentPosition!: number;
  @IsNotEmpty() @IsNumber() duration!: number;
  @IsNotEmpty() @IsNumber() playbackSpeed!: number;
  @IsNotEmpty() @IsBoolean() isPlaying!: boolean;
}

class PdfProgressBody {
  @IsNotEmpty() @IsString() assignmentId!: string;
  @IsNotEmpty() @IsString() materialId!: string;
  @IsNotEmpty() @IsNumber() pageNumber!: number;
  @IsNotEmpty() @IsNumber() totalPages!: number;
  @IsNotEmpty() @IsNumber() activeReadingTimeSeconds!: number;
}

@Controller("progress")
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post("heartbeat/video")
  @HttpCode(HttpStatus.OK)
  async recordVideoHeartbeat(
    @Body() dto: VideoHeartbeatBody,
    @CurrentUser("id") userId: string,
  ) {
    return this.progressService.recordVideoHeartbeat(dto, userId);
  }

  @Post("heartbeat/pdf")
  @HttpCode(HttpStatus.OK)
  async recordPdfProgress(
    @Body() dto: PdfProgressBody,
    @CurrentUser("id") userId: string,
  ) {
    return this.progressService.recordPdfProgress(dto, userId);
  }

  @Get("assignment/:assignmentId")
  async getAssignmentProgress(
    @Param("assignmentId") assignmentId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.progressService.getAssignmentProgress(assignmentId, userId);
  }
}
