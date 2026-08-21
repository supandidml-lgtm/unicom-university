import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { DatabaseService, DBTrainingProgram, DBTrainingAssignment, DBMaterial, DBCourse } from "../../database/database.service";
import { JobProfile, MaterialType, SystemRole, TrainingAssignmentStatus } from "@unicom/types";
import { DOMAIN_DEFAULTS, calculateOverallProgress } from "@unicom/config";

@Injectable()
export class TrainingService {
  constructor(private databaseService: DatabaseService) {}

  // 1. Programs
  async getPrograms(brandId?: string) {
    let list = this.databaseService.programs;
    if (brandId) {
      list = list.filter((p) => p.brandId === brandId);
    }
    return list.map((p) => {
      const brand = this.databaseService.brands.find((b) => b.id === p.brandId);
      const weeksCount = this.databaseService.courseWeeks.filter((w) => w.programId === p.id).length;
      return {
        ...p,
        brandName: brand?.name || "-",
        totalWeeksCount: weeksCount || p.numberOfWeeks,
      };
    });
  }

  async getProgramById(id: string) {
    const program = this.databaseService.programs.find((p) => p.id === id);
    if (!program) throw new NotFoundException("Program training tidak ditemukan.");

    const brand = this.databaseService.brands.find((b) => b.id === program.brandId);
    const weeks = this.databaseService.courseWeeks
      .filter((w) => w.programId === id)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const curriculum = weeks.map((w) => {
      const courses = this.databaseService.courses
        .filter((c) => c.weekId === w.id)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((c) => {
          const materials = this.databaseService.materials
            .filter((m) => m.courseId === c.id)
            .sort((a, b) => a.displayOrder - b.displayOrder);
          return { ...c, materials };
        });

      const exam = this.databaseService.exams.find((e) => e.weekId === w.id);
      return { ...w, courses, exam };
    });

    return {
      ...program,
      brandName: brand?.name || "-",
      curriculum,
    };
  }

  async createProgram(
    brandId: string,
    title: string,
    description: string,
    targetJobProfile: JobProfile,
    numberOfWeeks: number = 4,
    isSequential: boolean = true,
    actorEmail?: string,
  ) {
    const newProgram: DBTrainingProgram = {
      id: `prog-${Date.now()}`,
      brandId,
      title: title.trim(),
      description: description.trim(),
      targetJobProfile,
      numberOfWeeks,
      isSequential,
      passingScore: DOMAIN_DEFAULTS.EXAM.DEFAULT_PASSING_SCORE,
      courseWeight: DOMAIN_DEFAULTS.WEIGHTS.COURSE_PROGRESS_WEIGHT,
      examWeight: DOMAIN_DEFAULTS.WEIGHTS.EXAM_PROGRESS_WEIGHT,
      isActive: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.databaseService.programs.push(newProgram);

    // Automatically scaffold N course weeks
    for (let i = 1; i <= numberOfWeeks; i++) {
      this.databaseService.courseWeeks.push({
        id: `week-${newProgram.id}-${i}`,
        programId: newProgram.id,
        weekNumber: i,
        title: `Minggu ${i} — Modul Pelatihan`,
        description: `Kurikulum pembelajaran minggu ke-${i}.`,
        displayOrder: i,
      });
    }

    this.databaseService.logAudit({
      actorEmail,
      action: "TRAINING_PROGRAM_CREATED",
      resource: "TRAINING_PROGRAM",
      resourceId: newProgram.id,
      details: { title: newProgram.title, brandId, weeks: numberOfWeeks },
    });

    return newProgram;
  }

  // 2. Assignments
  async getAssignments(userRole: SystemRole, userId: string, branchId?: string) {
    let list = this.databaseService.assignments;

    if (userRole === SystemRole.STAFF) {
      list = list.filter((a) => a.userId === userId);
    } else if (userRole === SystemRole.TRAINER) {
      list = list.filter((a) => a.trainerId === userId || a.trainerId === undefined);
    } else if (userRole === SystemRole.SUPERVISOR && branchId) {
      // Filter by users in supervisor's branch
      const branchUserIds = this.databaseService.users
        .filter((u) => u.branchId === branchId)
        .map((u) => u.id);
      list = list.filter((a) => branchUserIds.includes(a.userId));
    }

    return list.map((a) => {
      const user = this.databaseService.users.find((u) => u.id === a.userId);
      const program = this.databaseService.programs.find((p) => p.id === a.programId);
      const brand = program ? this.databaseService.brands.find((b) => b.id === program.brandId) : undefined;
      const trainer = a.trainerId ? this.databaseService.users.find((u) => u.id === a.trainerId) : undefined;
      const branch = user ? this.databaseService.branches.find((b) => b.id === user.branchId) : undefined;

      return {
        id: a.id,
        userId: a.userId,
        userName: user?.name || "Trainee",
        userNik: user?.nik || "-",
        userBranch: branch?.name || "-",
        programId: a.programId,
        programTitle: program?.title || "-",
        brandName: brand?.name || "-",
        trainerName: trainer?.name || "Unicom Trainer",
        startDate: a.startDate,
        deadlineDate: a.deadlineDate,
        status: a.status,
        courseProgressPercentage: a.courseProgressPercentage,
        examProgressPercentage: a.examProgressPercentage,
        overallProgressPercentage: a.overallProgressPercentage,
        averageScore: a.averageScore || 0,
        createdAt: a.createdAt,
      };
    });
  }

  async createAssignment(
    userId: string,
    programId: string,
    trainerId: string,
    startDate: string,
    deadlineDate: string,
    actorEmail?: string,
  ) {
    const existing = this.databaseService.assignments.find(
      (a) => a.userId === userId && a.programId === programId && a.status === TrainingAssignmentStatus.IN_PROGRESS,
    );
    if (existing) {
      throw new ConflictException("Peserta sudah memiliki assignment aktif untuk program training ini.");
    }

    const assignment: DBTrainingAssignment = {
      id: `asg-${Date.now()}`,
      userId,
      programId,
      trainerId,
      startDate,
      deadlineDate,
      status: TrainingAssignmentStatus.IN_PROGRESS,
      courseProgressPercentage: 0,
      examProgressPercentage: 0,
      overallProgressPercentage: 0,
      averageScore: 0,
      passRatePercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.databaseService.assignments.push(assignment);

    this.databaseService.logAudit({
      actorEmail,
      action: "TRAINING_ASSIGNMENT_CREATED",
      resource: "TRAINING_ASSIGNMENT",
      resourceId: assignment.id,
      details: { userId, programId, trainerId, deadlineDate },
    });

    return assignment;
  }

  // 3. Materials
  async addMaterial(
    courseId: string,
    title: string,
    type: MaterialType,
    fileKey: string,
    durationSeconds?: number,
    totalPages?: number,
    sourceText?: string,
    actorEmail?: string,
  ) {
    const course = this.databaseService.courses.find((c) => c.id === courseId);
    if (!course) throw new NotFoundException("Course tidak ditemukan.");

    const existingCount = this.databaseService.materials.filter((m) => m.courseId === courseId).length;

    const material: DBMaterial = {
      id: `mat-${type.toLowerCase()}-${Date.now()}`,
      courseId,
      title: title.trim(),
      type,
      version: 1,
      fileKey,
      durationSeconds: type === MaterialType.VIDEO ? durationSeconds || 300 : undefined,
      totalPages: type === MaterialType.PDF ? totalPages || 5 : undefined,
      sourceText,
      isRequired: true,
      displayOrder: existingCount + 1,
      createdAt: new Date().toISOString(),
    };

    this.databaseService.materials.push(material);

    this.databaseService.logAudit({
      actorEmail,
      action: "MATERIAL_UPLOADED",
      resource: "MATERIAL",
      resourceId: material.id,
      details: { courseId, title: material.title, type },
    });

    return material;
  }
}
