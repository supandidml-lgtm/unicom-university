import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { SystemRole, TrainingAssignmentStatus } from "@unicom/types";

@Injectable()
export class ReportsService {
  constructor(private databaseService: DatabaseService) {}

  async getDashboardKPI(userRole: SystemRole, userId: string, branchId?: string) {
    const totalUsers = this.databaseService.users.length;
    const totalPrograms = this.databaseService.programs.length;
    const totalBrands = this.databaseService.brands.length;
    const totalBranches = this.databaseService.branches.length;
    const assignments = this.databaseService.assignments;

    // Staff KPI
    if (userRole === SystemRole.STAFF) {
      const myAssignments = assignments.filter((a) => a.userId === userId);
      const activeAsg = myAssignments.find((a) => a.status === TrainingAssignmentStatus.IN_PROGRESS);
      const completedCount = myAssignments.filter((a) => a.status === TrainingAssignmentStatus.COMPLETED).length;

      const myAttempts = this.databaseService.examAttempts.filter(
        (ea) => myAssignments.map((a) => a.id).includes(ea.assignmentId),
      );
      const passedAttempts = myAttempts.filter((ea) => ea.isPassed).length;
      const passRate = myAttempts.length > 0 ? Math.round((passedAttempts / myAttempts.length) * 100) : 0;
      const averageScore = myAttempts.length > 0
        ? Math.round((myAttempts.reduce((sum, a) => sum + a.score, 0) / myAttempts.length) * 10) / 10
        : 0;

      return {
        role: userRole,
        activeProgram: activeAsg ? {
          assignmentId: activeAsg.id,
          programTitle: this.databaseService.programs.find((p) => p.id === activeAsg.programId)?.title || "-",
          courseProgress: activeAsg.courseProgressPercentage,
          examProgress: activeAsg.examProgressPercentage,
          overallProgress: activeAsg.overallProgressPercentage,
          deadlineDate: activeAsg.deadlineDate,
        } : null,
        stats: {
          overallProgress: activeAsg?.overallProgressPercentage || 0,
          courseProgress: activeAsg?.courseProgressPercentage || 0,
          averageScore,
          passRate,
          completedPrograms: completedCount,
        },
      };
    }

    // Trainer KPI
    if (userRole === SystemRole.TRAINER) {
      const trainerAssignments = assignments.filter((a) => a.trainerId === userId || a.trainerId === undefined);
      const totalTrainees = new Set(trainerAssignments.map((a) => a.userId)).size;
      const completedAssignments = trainerAssignments.filter((a) => a.status === TrainingAssignmentStatus.COMPLETED).length;
      const inProgressAssignments = trainerAssignments.filter((a) => a.status === TrainingAssignmentStatus.IN_PROGRESS).length;

      const avgScore = trainerAssignments.length > 0
        ? Math.round((trainerAssignments.reduce((s, a) => s + (a.averageScore || 0), 0) / trainerAssignments.length) * 10) / 10
        : 0;

      const laggingTrainees = trainerAssignments
        .filter((a) => a.status === TrainingAssignmentStatus.IN_PROGRESS && a.overallProgressPercentage < 50)
        .map((a) => {
          const u = this.databaseService.users.find((user) => user.id === a.userId);
          const p = this.databaseService.programs.find((prog) => prog.id === a.programId);
          return {
            userName: u?.name || "-",
            userNik: u?.nik || "-",
            programTitle: p?.title || "-",
            overallProgress: a.overallProgressPercentage,
            deadline: a.deadlineDate,
          };
        });

      return {
        role: userRole,
        stats: {
          totalTrainees,
          activeAssignmentsCount: inProgressAssignments,
          completedAssignmentsCount: completedAssignments,
          cohortAverageScore: avgScore,
          laggingCount: laggingTrainees.length,
        },
        laggingTrainees,
      };
    }

    // Supervisor & Super Admin Global KPI
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter((a) => a.status === TrainingAssignmentStatus.COMPLETED).length;
    const inProgressAssignments = assignments.filter((a) => a.status === TrainingAssignmentStatus.IN_PROGRESS).length;
    const globalPassRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    const branchBreakdown = this.databaseService.branches.map((b) => {
      const branchUsers = this.databaseService.users.filter((u) => u.branchId === b.id);
      const branchUserIds = branchUsers.map((u) => u.id);
      const branchAssignments = assignments.filter((a) => branchUserIds.includes(a.userId));
      const branchCompleted = branchAssignments.filter((a) => a.status === TrainingAssignmentStatus.COMPLETED).length;

      return {
        branchId: b.id,
        branchName: b.name,
        city: b.city,
        totalTrainees: branchUsers.length,
        activeAssignments: branchAssignments.length,
        completionRate: branchAssignments.length > 0 ? Math.round((branchCompleted / branchAssignments.length) * 100) : 0,
      };
    });

    const brandBreakdown = this.databaseService.brands.map((brand) => {
      const brandPrograms = this.databaseService.programs.filter((p) => p.brandId === brand.id);
      const brandProgramIds = brandPrograms.map((p) => p.id);
      const brandAssignments = assignments.filter((a) => brandProgramIds.includes(a.programId));
      const brandCompleted = brandAssignments.filter((a) => a.status === TrainingAssignmentStatus.COMPLETED).length;

      return {
        brandId: brand.id,
        brandName: brand.name,
        code: brand.code,
        programsCount: brandPrograms.length,
        totalEnrollments: brandAssignments.length,
        completedCount: brandCompleted,
      };
    });

    return {
      role: userRole,
      stats: {
        totalUsers,
        totalPrograms,
        totalBrands,
        totalBranches,
        totalAssignments,
        inProgressAssignments,
        completedAssignments,
        globalPassRate,
      },
      branchBreakdown,
      brandBreakdown,
    };
  }

  async getExportData() {
    return this.databaseService.assignments.map((a) => {
      const user = this.databaseService.users.find((u) => u.id === a.userId);
      const program = this.databaseService.programs.find((p) => p.id === a.programId);
      const branch = user ? this.databaseService.branches.find((b) => b.id === user.branchId) : undefined;
      const brand = program ? this.databaseService.brands.find((b) => b.id === program.brandId) : undefined;

      return {
        nik: user?.nik || "-",
        name: user?.name || "-",
        branch: branch?.name || "-",
        city: branch?.city || "-",
        brand: brand?.name || "-",
        program: program?.title || "-",
        courseProgress: `${a.courseProgressPercentage}%`,
        examProgress: `${a.examProgressPercentage}%`,
        overallProgress: `${a.overallProgressPercentage}%`,
        averageScore: a.averageScore || 0,
        status: a.status,
        startDate: a.startDate,
        deadlineDate: a.deadlineDate,
        completedAt: a.completedAt || "-",
      };
    });
  }
}
