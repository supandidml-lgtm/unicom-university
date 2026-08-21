import { SystemRole, JobProfile } from "./roles";
import { AccountStatus, TrainingAssignmentStatus, LearningStatus } from "./status";
import { MaterialType } from "./materials";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  username: string;
  nik?: string;
  role: SystemRole;
  jobProfile?: JobProfile;
  branchId?: string;
  branchName?: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  brandId: string;
  brandName?: string;
  targetJobProfile: JobProfile;
  numberOfWeeks: number;
  isSequential: boolean;
  passingScore: number;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingAssignment {
  id: string;
  userId: string;
  userName?: string;
  trainingProgramId: string;
  trainingProgramTitle?: string;
  brandId: string;
  brandName?: string;
  branchId: string;
  branchName?: string;
  trainerId?: string;
  trainerName?: string;
  startDate: string;
  deadlineDate: string;
  status: TrainingAssignmentStatus;
  completedAt?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  weekId: string;
  title: string;
  description?: string;
  displayOrder: number;
  estimatedMinutes?: number;
  status?: LearningStatus;
  materialsCount?: number;
}

export interface Material {
  id: string;
  courseId: string;
  title: string;
  type: MaterialType;
  version: number;
  displayOrder: number;
  fileKey?: string;
  durationSeconds?: number;
  totalPages?: number;
  isRequired: boolean;
}
