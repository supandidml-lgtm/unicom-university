import type { PrismaClient } from '@prisma/client';
import { systemPermissions, systemRoles } from './rbac.js';

export async function seedAuthorizationData(client: PrismaClient): Promise<void> {
  await client.$transaction(async (transaction) => {
    for (const role of systemRoles) {
      await transaction.role.upsert({
        where: { code: role.code },
        update: { name: role.name, description: role.description, isSystem: true, isActive: true },
        create: { ...role, isSystem: true },
      });
    }

    for (const permission of systemPermissions) {
      await transaction.permission.upsert({
        where: { code: permission.code },
        update: { ...permission, isSystem: true },
        create: { ...permission, isSystem: true },
      });
    }

    const trainer = await transaction.role.findUniqueOrThrow({
      where: { code: 'TRAINER' },
      select: { id: true },
    });
    const trainerPermissionCodes = [
      'brands.read',
      'participants.read',
      'participants.create',
      'participants.update',
      'participants.disable',
      'participants.reactivate',
      'participants.invite',
      'enrollments.read',
      'enrollments.create',
      'enrollments.update',
      'enrollments.cancel',
      'curricula.read',
      'curricula.create',
      'curricula.update',
      'curriculum_versions.read',
      'curriculum_versions.create',
      'curriculum_versions.update',
      'curriculum_versions.publish',
      'curriculum_weeks.manage',
      'curriculum_modules.manage',
      'materials.read',
      'materials.create',
      'materials.update',
      'materials.remove',
      'materials.reorder',
      'materials.upload',
      'learning_progress.read',
      'exams.read',
      'exams.create',
      'exams.update',
      'questions.read',
      'questions.create',
      'questions.update',
      'questions.approve',
      'questions.ai_generate',
      'reports.read',
      'reports.export',
      'exam_results.read',
      'certificates.read',
      'certificates.issue',
    ];
    const trainerPermissions = await transaction.permission.findMany({
      where: { code: { in: trainerPermissionCodes } },
      select: { id: true },
    });
    for (const permission of trainerPermissions) {
      await transaction.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: trainer.id, permissionId: permission.id } },
        update: {},
        create: { roleId: trainer.id, permissionId: permission.id },
      });
    }
    const trainee = await transaction.role.findUniqueOrThrow({
      where: { code: 'TRAINEE' },
      select: { id: true },
    });
    const selfEnrollmentRead = await transaction.permission.findUniqueOrThrow({
      where: { code: 'enrollments.read_self' },
      select: { id: true },
    });
    await transaction.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: trainee.id, permissionId: selfEnrollmentRead.id } },
      update: {},
      create: { roleId: trainee.id, permissionId: selfEnrollmentRead.id },
    });
    const traineeAttemptPermissionCodes = [
      'training_progress.read_self',
      'exam_attempts.start_self',
      'exam_attempts.answer_self',
      'exam_attempts.submit_self',
      'exam_attempts.read_self',
      'certificates.read_self',
    ];
    const traineeAttemptPermissions = await transaction.permission.findMany({
      where: { code: { in: traineeAttemptPermissionCodes } },
      select: { id: true },
    });
    for (const permission of traineeAttemptPermissions) {
      await transaction.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: trainee.id, permissionId: permission.id } },
        update: {},
        create: { roleId: trainee.id, permissionId: permission.id },
      });
    }
    const selfLearningContentRead = await transaction.permission.findUniqueOrThrow({
      where: { code: 'learning_content.read_self' },
      select: { id: true },
    });
    await transaction.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: trainee.id, permissionId: selfLearningContentRead.id },
      },
      update: {},
      create: { roleId: trainee.id, permissionId: selfLearningContentRead.id },
    });
  });
}
