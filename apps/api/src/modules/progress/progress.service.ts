import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { DatabaseService, DBMaterialProgress, DBTrainingAssignment } from "../../database/database.service";
import { LearningStatus, MaterialType, TrainingAssignmentStatus } from "@unicom/types";
import { DOMAIN_DEFAULTS, calculateOverallProgress } from "@unicom/config";

export interface VideoHeartbeatDto {
  assignmentId: string;
  materialId: string;
  currentPosition: number;
  duration: number;
  playbackSpeed: number;
  isPlaying: boolean;
}

export interface PdfProgressDto {
  assignmentId: string;
  materialId: string;
  pageNumber: number;
  totalPages: number;
  activeReadingTimeSeconds: number;
}

@Injectable()
export class ProgressService {
  constructor(private databaseService: DatabaseService) {}

  // 1. Process Video Heartbeat (Anti-Skip Engine)
  async recordVideoHeartbeat(dto: VideoHeartbeatDto, userId: string) {
    const assignment = this.databaseService.assignments.find(
      (a) => a.id === dto.assignmentId && a.userId === userId,
    );
    if (!assignment) {
      throw new NotFoundException("Assignment training tidak ditemukan untuk pengguna ini.");
    }

    const material = this.databaseService.materials.find((m) => m.id === dto.materialId);
    if (!material || material.type !== MaterialType.VIDEO) {
      throw new NotFoundException("Materi video tidak valid.");
    }

    // Security validation: speed cap at 2.0x per PRD §37
    if (dto.playbackSpeed > 2.0) {
      throw new BadRequestException("Kecepatan pemutaran maksimal adalah 2.0x.");
    }

    let progress = this.databaseService.materialProgress.find(
      (p) => p.assignmentId === dto.assignmentId && p.materialId === dto.materialId,
    );

    if (!progress) {
      progress = {
        id: `prog-${Date.now()}`,
        assignmentId: dto.assignmentId,
        materialId: dto.materialId,
        materialVersion: material.version,
        status: LearningStatus.IN_PROGRESS,
        percentage: 0,
        watchedSegments: [],
        visitedPages: [],
        lastPositionSeconds: dto.currentPosition,
        updatedAt: new Date().toISOString(),
      };
      this.databaseService.materialProgress.push(progress);
    }

    if (dto.isPlaying && dto.currentPosition > 0) {
      // Accumulate watched interval (e.g. 5-second window ending at currentPosition)
      const windowStart = Math.max(0, dto.currentPosition - 5);
      const windowEnd = Math.min(dto.duration, dto.currentPosition);
      this.mergeSegment(progress.watchedSegments, windowStart, windowEnd);
    }

    progress.lastPositionSeconds = dto.currentPosition;
    progress.updatedAt = new Date().toISOString();

    // Calculate unique watched coverage
    const totalDuration = dto.duration || material.durationSeconds || 300;
    const uniqueWatchedSeconds = this.calculateUniqueWatchedSeconds(progress.watchedSegments);
    const coverageRatio = Math.min(1.0, uniqueWatchedSeconds / totalDuration);
    progress.percentage = Math.round(coverageRatio * 100);

    // Completion Threshold: 98% (PRD §35)
    if (coverageRatio >= DOMAIN_DEFAULTS.COMPLETION_THRESHOLDS.VIDEO_UNIQUE_COVERAGE_RATIO) {
      if (progress.status !== LearningStatus.COMPLETED) {
        progress.status = LearningStatus.COMPLETED;
        progress.completedAt = new Date().toISOString();
        progress.percentage = 100;
        await this.recalculateAssignmentProgress(assignment);
      }
    }

    return {
      materialId: progress.materialId,
      status: progress.status,
      percentage: progress.percentage,
      uniqueWatchedSeconds,
      totalDuration,
      isCompleted: progress.status === LearningStatus.COMPLETED,
    };
  }

  // 2. Process PDF Reading Engagement
  async recordPdfProgress(dto: PdfProgressDto, userId: string) {
    const assignment = this.databaseService.assignments.find(
      (a) => a.id === dto.assignmentId && a.userId === userId,
    );
    if (!assignment) {
      throw new NotFoundException("Assignment training tidak ditemukan.");
    }

    const material = this.databaseService.materials.find((m) => m.id === dto.materialId);
    if (!material || material.type !== MaterialType.PDF) {
      throw new NotFoundException("Materi PDF tidak valid.");
    }

    let progress = this.databaseService.materialProgress.find(
      (p) => p.assignmentId === dto.assignmentId && p.materialId === dto.materialId,
    );

    if (!progress) {
      progress = {
        id: `prog-${Date.now()}`,
        assignmentId: dto.assignmentId,
        materialId: dto.materialId,
        materialVersion: material.version,
        status: LearningStatus.IN_PROGRESS,
        percentage: 0,
        watchedSegments: [],
        visitedPages: [],
        updatedAt: new Date().toISOString(),
      };
      this.databaseService.materialProgress.push(progress);
    }

    // Require dwell time >= 2 seconds before counting page engagement
    if (dto.activeReadingTimeSeconds >= 2 && !progress.visitedPages.includes(dto.pageNumber)) {
      progress.visitedPages.push(dto.pageNumber);
      progress.visitedPages.sort((a, b) => a - b);
    }

    const totalPages = dto.totalPages || material.totalPages || 5;
    const coverageRatio = progress.visitedPages.length / totalPages;
    progress.percentage = Math.min(100, Math.round(coverageRatio * 100));
    progress.updatedAt = new Date().toISOString();

    // 100% Page Coverage required for PDF (PRD §44)
    if (progress.visitedPages.length >= totalPages) {
      if (progress.status !== LearningStatus.COMPLETED) {
        progress.status = LearningStatus.COMPLETED;
        progress.completedAt = new Date().toISOString();
        progress.percentage = 100;
        await this.recalculateAssignmentProgress(assignment);
      }
    }

    return {
      materialId: progress.materialId,
      status: progress.status,
      percentage: progress.percentage,
      visitedPages: progress.visitedPages,
      totalPages,
      isCompleted: progress.status === LearningStatus.COMPLETED,
    };
  }

  // 3. Server-Authoritative Progress Recalculation Engine
  public async recalculateAssignmentProgress(assignment: DBTrainingAssignment): Promise<void> {
    const program = this.databaseService.programs.find((p) => p.id === assignment.programId);
    if (!program) return;

    const weeks = this.databaseService.courseWeeks.filter((w) => w.programId === program.id);
    const weekIds = weeks.map((w) => w.id);
    const courses = this.databaseService.courses.filter((c) => weekIds.includes(c.weekId));
    const courseIds = courses.map((c) => c.id);
    const materials = this.databaseService.materials.filter((m) => courseIds.includes(m.courseId) && m.isRequired);
    const exams = this.databaseService.exams.filter((e) => weekIds.includes(e.weekId));

    // Calculate Course Progress %
    const totalMaterialsCount = materials.length;
    let completedMaterialsCount = 0;

    materials.forEach((mat) => {
      const p = this.databaseService.materialProgress.find(
        (mp) => mp.assignmentId === assignment.id && mp.materialId === mat.id && mp.status === LearningStatus.COMPLETED,
      );
      if (p) completedMaterialsCount++;
    });

    const courseProgress = totalMaterialsCount > 0
      ? Math.round((completedMaterialsCount / totalMaterialsCount) * 100)
      : 100;

    // Calculate Exam Progress %
    const totalExamsCount = exams.length;
    let passedExamsCount = 0;
    let totalScoreSum = 0;
    let totalAttemptsCount = 0;

    exams.forEach((exam) => {
      const attempts = this.databaseService.examAttempts.filter(
        (ea) => ea.assignmentId === assignment.id && ea.examId === exam.id,
      );
      const passedAttempt = attempts.find((ea) => ea.isPassed);
      if (passedAttempt) {
        passedExamsCount++;
      }
      if (attempts.length > 0) {
        const bestAttempt = attempts.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), attempts[0]!);
        totalScoreSum += bestAttempt.score;
        totalAttemptsCount++;
      }
    });

    const examProgress = totalExamsCount > 0
      ? Math.round((passedExamsCount / totalExamsCount) * 100)
      : 100;

    const averageScore = totalAttemptsCount > 0 ? Math.round((totalScoreSum / totalAttemptsCount) * 10) / 10 : 0;
    const passRate = totalExamsCount > 0 ? Math.round((passedExamsCount / totalExamsCount) * 100) : 0;

    // Overall Progress Formula: (Course% * 0.6) + (Exam% * 0.4)
    const overallProgress = calculateOverallProgress(courseProgress, examProgress);

    assignment.courseProgressPercentage = courseProgress;
    assignment.examProgressPercentage = examProgress;
    assignment.overallProgressPercentage = overallProgress;
    assignment.averageScore = averageScore;
    assignment.passRatePercentage = passRate;
    assignment.updatedAt = new Date().toISOString();

    if (overallProgress >= 100 && assignment.status !== TrainingAssignmentStatus.COMPLETED) {
      assignment.status = TrainingAssignmentStatus.COMPLETED;
      assignment.completedAt = new Date().toISOString();
    }
  }

  // 4. Helper for segment merging
  private mergeSegment(segments: Array<{ start: number; end: number }>, start: number, end: number) {
    if (start >= end) return;
    segments.push({ start, end });
    segments.sort((a, b) => a.start - b.start);

    const merged: Array<{ start: number; end: number }> = [];
    for (const seg of segments) {
      if (merged.length === 0) {
        merged.push({ ...seg });
      } else {
        const last = merged[merged.length - 1]!;
        if (seg.start <= last.end) {
          last.end = Math.max(last.end, seg.end);
        } else {
          merged.push({ ...seg });
        }
      }
    }
    segments.length = 0;
    segments.push(...merged);
  }

  private calculateUniqueWatchedSeconds(segments: Array<{ start: number; end: number }>): number {
    return segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  }

  // 5. Get Trainee Progress Overview
  async getAssignmentProgress(assignmentId: string, userId: string) {
    const assignment = this.databaseService.assignments.find(
      (a) => a.id === assignmentId && a.userId === userId,
    );
    if (!assignment) throw new NotFoundException("Assignment tidak ditemukan.");

    const materialProgressList = this.databaseService.materialProgress.filter(
      (mp) => mp.assignmentId === assignmentId,
    );

    const examAttemptsList = this.databaseService.examAttempts.filter(
      (ea) => ea.assignmentId === assignmentId,
    );

    return {
      assignmentId,
      status: assignment.status,
      courseProgressPercentage: assignment.courseProgressPercentage,
      examProgressPercentage: assignment.examProgressPercentage,
      overallProgressPercentage: assignment.overallProgressPercentage,
      averageScore: assignment.averageScore || 0,
      materialProgress: materialProgressList,
      examAttempts: examAttemptsList,
    };
  }
}
