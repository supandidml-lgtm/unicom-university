export enum SkillCategory {
  SOP = "SOP",
  HARDWARE = "HARDWARE",
  SOFTWARE = "SOFTWARE",
  TROUBLESHOOTING = "TROUBLESHOOTING",
  CUSTOMER_SERVICE = "CUSTOMER_SERVICE",
}

export enum CompetencyLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
  EXPERT = "EXPERT",
}

export interface SkillMatrixEntry {
  id: string;
  userId: string;
  brandId: string;
  brandName: string;
  category: SkillCategory;
  score: number; // 0 - 100
  level: CompetencyLevel;
  lastCalculatedAt: string;
}

export interface UserCompetencyProfile {
  userId: string;
  userName: string;
  userNik: string;
  jobProfile: string;
  branchName: string;
  overallScore: number;
  overallLevel: CompetencyLevel;
  brandScores: Array<{
    brandId: string;
    brandName: string;
    score: number;
    level: CompetencyLevel;
    categories: Array<{
      category: SkillCategory;
      score: number;
    }>;
  }>;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  userId: string;
  userName: string;
  userNik: string;
  programId: string;
  programTitle: string;
  brandId: string;
  brandName: string;
  finalScore: number;
  issuedAt: string;
  verificationToken: string;
  verificationUrl: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
}

export interface PracticalEvaluation {
  id: string;
  userId: string;
  userName: string;
  userNik: string;
  trainerId: string;
  trainerName: string;
  courseId: string;
  courseTitle: string;
  esdScore: number; // 0-100 (20%)
  disassemblyScore: number; // 0-100 (30%)
  diagnosisScore: number; // 0-100 (30%)
  documentationScore: number; // 0-100 (20%)
  totalScore: number; // 0-100 weighted
  trainerNotes: string;
  evaluatedAt: string;
}

export interface KnowledgeCitation {
  documentName: string;
  pageNumber?: number;
  timestamp?: string;
  snippet: string;
  url?: string;
}

export interface KnowledgeQueryResponse {
  query: string;
  answer: string;
  confidence: number;
  citations: KnowledgeCitation[];
  hasSufficientSources: boolean;
  suggestedFollowUps?: string[];
  answeredAt: string;
}

export interface MultiBranchAnalytics {
  branches: Array<{
    branchId: string;
    branchName: string;
    totalStaff: number;
    activeTrainees: number;
    completionRate: number;
    averageScore: number;
    passRate: number;
    atRiskCount: number;
    overdueCount: number;
  }>;
  brandPerformance: Array<{
    brandId: string;
    brandName: string;
    enrolledCount: number;
    averageScore: number;
    certifiedCount: number;
  }>;
  cohortHealth: {
    onTrack: number;
    atRisk: number;
    overdue: number;
  };
}
