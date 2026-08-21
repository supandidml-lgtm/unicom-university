import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import {
  SystemRole,
  JobProfile,
  AccountStatus,
  TrainingAssignmentStatus,
  LearningStatus,
  ExamStatus,
  MaterialType,
  QuestionType,
  QuestionDifficulty,
} from "@unicom/types";
import { DOMAIN_DEFAULTS, calculateOverallProgress } from "@unicom/config";
import * as bcrypt from "bcryptjs";

export interface DBUser {
  id: string;
  nik: string;
  name: string;
  email: string;
  passwordHash: string;
  role: SystemRole;
  jobProfile: JobProfile;
  branchId: string;
  brandIds: string[];
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DBBrand {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface DBBranch {
  id: string;
  name: string;
  code: string;
  city: string;
  isActive: boolean;
  createdAt: string;
}

export interface DBTrainingProgram {
  id: string;
  brandId: string;
  title: string;
  description: string;
  targetJobProfile: JobProfile;
  numberOfWeeks: number;
  isSequential: boolean;
  passingScore: number;
  courseWeight: number;
  examWeight: number;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DBTrainingAssignment {
  id: string;
  userId: string;
  programId: string;
  trainerId?: string;
  startDate: string;
  deadlineDate: string;
  status: TrainingAssignmentStatus;
  completedAt?: string;
  courseProgressPercentage: number;
  examProgressPercentage: number;
  overallProgressPercentage: number;
  averageScore?: number;
  passRatePercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DBCourseWeek {
  id: string;
  programId: string;
  weekNumber: number;
  title: string;
  description: string;
  displayOrder: number;
}

export interface DBCourse {
  id: string;
  weekId: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  displayOrder: number;
}

export interface DBMaterial {
  id: string;
  courseId: string;
  title: string;
  type: MaterialType;
  version: number;
  fileKey: string;
  durationSeconds?: number;
  totalPages?: number;
  sourceText?: string;
  isRequired: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface DBMaterialProgress {
  id: string;
  assignmentId: string;
  materialId: string;
  materialVersion: number;
  status: LearningStatus;
  percentage: number;
  watchedSegments: Array<{ start: number; end: number }>;
  visitedPages: number[];
  lastPositionSeconds?: number;
  completedAt?: string;
  updatedAt: string;
}

export interface DBExam {
  id: string;
  weekId: string;
  title: string;
  description: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  cooldownMinutes: number;
  version: number;
  isActive: boolean;
  createdAt: string;
}

export interface DBExamQuestion {
  id: string;
  examId: string;
  examVersion: number;
  questionText: string;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  options: Array<{ id: string; optionText: string; isCorrect: boolean }>;
  explanation?: string;
  sourceGrounding?: {
    materialId: string;
    materialVersion: number;
    sourceChunkId?: string;
    excerptSnippet?: string;
  };
}

export interface DBExamAttempt {
  id: string;
  assignmentId: string;
  examId: string;
  examVersion: number;
  attemptNumber: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  status: ExamStatus;
  answers: Array<{ questionId: string; selectedOptionIds: string[]; isCorrect: boolean }>;
  startedAt: string;
  submittedAt: string;
}

export interface DBAuditLog {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface DBNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "ASSIGNMENT" | "EXAM_GRADED" | "MATERIAL_NEW" | "SYSTEM" | "DEADLINE_ALERT";
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  // In-Memory Master Collections
  public users: DBUser[] = [];
  public brands: DBBrand[] = [];
  public branches: DBBranch[] = [];
  public programs: DBTrainingProgram[] = [];
  public assignments: DBTrainingAssignment[] = [];
  public courseWeeks: DBCourseWeek[] = [];
  public courses: DBCourse[] = [];
  public materials: DBMaterial[] = [];
  public materialProgress: DBMaterialProgress[] = [];
  public exams: DBExam[] = [];
  public examQuestions: DBExamQuestion[] = [];
  public examAttempts: DBExamAttempt[] = [];
  public auditLogs: DBAuditLog[] = [];
  public notifications: DBNotification[] = [];

  async onModuleInit() {
    await this.seedInitialDatabase();
  }

  public async seedInitialDatabase(): Promise<void> {
    this.logger.log("🌱 Seeding Authoritative Initial Database for Unicom University...");

    const defaultPasswordHash = await bcrypt.hash("UnicomPassword2026!", 10);

    // 1. Brands
    this.brands = [
      { id: "brand-xiaomi", name: "Xiaomi", code: "MI", description: "Smartphones, IoT & Lifestyle Ecosystem", isActive: true, createdAt: new Date().toISOString() },
      { id: "brand-huawei", name: "Huawei", code: "HW", description: "Smart Devices, Laptops & Networking", isActive: true, createdAt: new Date().toISOString() },
      { id: "brand-ecovacs", name: "Ecovacs", code: "ECO", description: "Robotics Vacuum Cleaners & Window Cleaners", isActive: true, createdAt: new Date().toISOString() },
      { id: "brand-tineco", name: "Tineco", code: "TIN", description: "Smart Floor Washers & Wet Cleaners", isActive: true, createdAt: new Date().toISOString() },
      { id: "brand-laifen", name: "Laifen", code: "LAF", description: "High-Speed Hair Dryers & Personal Care", isActive: true, createdAt: new Date().toISOString() },
      { id: "brand-yoniev", name: "Yoniev", code: "YON", description: "Cordless Vacuum & Cleaning Solutions", isActive: true, createdAt: new Date().toISOString() },
    ];

    // 2. Branches
    this.branches = [
      { id: "branch-jkt-pusat", name: "Service Center Jakarta Pusat", code: "JKT-01", city: "Jakarta", isActive: true, createdAt: new Date().toISOString() },
      { id: "branch-sby", name: "Service Center Surabaya", code: "SBY-01", city: "Surabaya", isActive: true, createdAt: new Date().toISOString() },
      { id: "branch-bdg", name: "Service Center Bandung", code: "BDG-01", city: "Bandung", isActive: true, createdAt: new Date().toISOString() },
      { id: "branch-mdn", name: "Service Center Medan", code: "MDN-01", city: "Medan", isActive: true, createdAt: new Date().toISOString() },
      { id: "branch-mks", name: "Service Center Makassar", code: "MKS-01", city: "Makassar", isActive: true, createdAt: new Date().toISOString() },
    ];

    // 3. Users (Super Admin, Trainer, Supervisor, Technicians, CS)
    this.users = [
      {
        id: "usr-admin-1",
        nik: "ADM001",
        name: "Ahmad Fauzi (Super Admin)",
        email: "admin@unicom.co.id",
        passwordHash: defaultPasswordHash,
        role: SystemRole.SUPER_ADMIN,
        jobProfile: JobProfile.ADMIN,
        branchId: "branch-jkt-pusat",
        brandIds: ["brand-xiaomi", "brand-huawei", "brand-ecovacs", "brand-tineco", "brand-laifen", "brand-yoniev"],
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "usr-trainer-1",
        nik: "TRN001",
        name: "Budi Santoso (Senior Trainer)",
        email: "trainer@unicom.co.id",
        passwordHash: defaultPasswordHash,
        role: SystemRole.TRAINER,
        jobProfile: JobProfile.TECHNICIAN,
        branchId: "branch-jkt-pusat",
        brandIds: ["brand-xiaomi", "brand-huawei"],
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "usr-spv-1",
        nik: "SPV001",
        name: "Chandra Wijaya (Supervisor Jakarta)",
        email: "supervisor.jkt@unicom.co.id",
        passwordHash: defaultPasswordHash,
        role: SystemRole.SUPERVISOR,
        jobProfile: JobProfile.ADMIN,
        branchId: "branch-jkt-pusat",
        brandIds: ["brand-xiaomi", "brand-huawei", "brand-ecovacs"],
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "usr-staff-1",
        nik: "UC10042",
        name: "Andi Pratama (Technician)",
        email: "andi.pratama@unicom.co.id",
        passwordHash: defaultPasswordHash,
        role: SystemRole.STAFF,
        jobProfile: JobProfile.TECHNICIAN,
        branchId: "branch-jkt-pusat",
        brandIds: ["brand-xiaomi"],
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "usr-staff-2",
        nik: "UC10043",
        name: "Bambang Wijaya (CS Staff)",
        email: "bambang.wijaya@unicom.co.id",
        passwordHash: defaultPasswordHash,
        role: SystemRole.STAFF,
        jobProfile: JobProfile.CUSTOMER_SERVICE,
        branchId: "branch-sby",
        brandIds: ["brand-xiaomi"],
        status: AccountStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 4. Training Programs
    this.programs = [
      {
        id: "prog-xiaomi-tech",
        brandId: "brand-xiaomi",
        title: "Xiaomi Certified Technician Training",
        description: "Kurikulum resmi standar servis perangkat Xiaomi: diagnosa motherboard, penggantian display AMOLED, dan penanganan sirkuit daya.",
        targetJobProfile: JobProfile.TECHNICIAN,
        numberOfWeeks: 4,
        isSequential: true,
        passingScore: 80,
        courseWeight: 0.60,
        examWeight: 0.40,
        isActive: true,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prog-huawei-tech",
        brandId: "brand-huawei",
        title: "Huawei Authorized Service Training",
        description: "Standar operasional perbaikan unit Huawei, kalibrasi kamera Leica/XMAGE, dan SOP QC laboratorium.",
        targetJobProfile: JobProfile.TECHNICIAN,
        numberOfWeeks: 4,
        isSequential: true,
        passingScore: 80,
        courseWeight: 0.60,
        examWeight: 0.40,
        isActive: true,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 5. Course Weeks for Xiaomi Program
    this.courseWeeks = [
      { id: "week-mi-1", programId: "prog-xiaomi-tech", weekNumber: 1, title: "Week 1 — Onboarding, SOP & ESD Safety", description: "Standar keselamatan laboratorium, penerimaan unit, dan pencegahan kerusakan electrostatic.", displayOrder: 1 },
      { id: "week-mi-2", programId: "prog-xiaomi-tech", weekNumber: 2, title: "Week 2 — Hardware Diagnostics & Teardown", description: "Teknik pembongkaran aman tanpa merusak backcover, seal anti-air, dan modul kamera.", displayOrder: 2 },
      { id: "week-mi-3", programId: "prog-xiaomi-tech", weekNumber: 3, title: "Week 3 — Motherboard, IC Power & AMOLED", description: "Pengukuran tegangan skema sirkuit daya, kalibrasi sensor sidik jari optik di layar.", displayOrder: 3 },
      { id: "week-mi-4", programId: "prog-xiaomi-tech", weekNumber: 4, title: "Week 4 — Final Assessment & QC Certification", description: "Uji komprehensif 24 titik fungsi sebelum unit diserahkan kembali kepada customer.", displayOrder: 4 },
    ];

    // 6. Courses
    this.courses = [
      // Week 1
      { id: "course-mi-101", weekId: "week-mi-1", title: "SOP Penerimaan Unit & Validasi Garansi", description: "Alur registrasi IMEI pada sistem Unicom dan verifikasi bukti pembelian.", estimatedMinutes: 45, displayOrder: 1 },
      { id: "course-mi-102", weekId: "week-mi-1", title: "Prosedur Keselamatan ESD Lab", description: "Penggunaan wrist strap, mat anti-statis, dan grounding testing.", estimatedMinutes: 40, displayOrder: 2 },
      // Week 2
      { id: "course-mi-201", weekId: "week-mi-2", title: "Teknik Teardown Flagship Xiaomi", description: "Pemanasan heating pad temperatur aman dan suction cup separator.", estimatedMinutes: 60, displayOrder: 1 },
      // Week 3
      { id: "course-mi-301", weekId: "week-mi-3", title: "Troubleshooting Power IC & Charging Circuit", description: "Pengukuran arus bocor (leakage current) menggunakan DC Power Supply.", estimatedMinutes: 90, displayOrder: 1 },
      // Week 4
      { id: "course-mi-401", weekId: "week-mi-4", title: "Standar 24-Point Quality Check", description: "Pemeriksaan fungsi speaker, mic, sensor gyro, NFC, dan fast charging.", estimatedMinutes: 50, displayOrder: 1 },
    ];

    // 7. Materials (Videos & PDFs)
    this.materials = [
      {
        id: "mat-v-101",
        courseId: "course-mi-101",
        title: "Video SOP Penerimaan Unit & Cek Fisik",
        type: MaterialType.VIDEO,
        version: 1,
        fileKey: "videos/xiaomi-sop-reception-v1.mp4",
        durationSeconds: 300,
        sourceText: "Standar operasional penerimaan unit mewajibkan teknisi melakukan pemeriksaan visual 360 derajat. Foto seluruh goresan atau dent pada body unit. Cocokkan IMEI pada baki SIM dengan kartu garansi resmi. Verifikasi status tamper sticker pada baut motherboard.",
        isRequired: true,
        displayOrder: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: "mat-p-101",
        courseId: "course-mi-101",
        title: "Buku Pedoman Garansi Resmi Xiaomi 2026",
        type: MaterialType.PDF,
        version: 1,
        fileKey: "docs/xiaomi-warranty-handbook-2026.pdf",
        totalPages: 5,
        sourceText: "Halaman 1: Kategori Kerusakan Yang Dicakup Garansi. Garansi mencakup kegagalan fungsi manufaktur. Halaman 2: Void Garansi akibat cairan (Liquid Damage Indicator berubah merah). Halaman 3: Prosedur pergantian unit DOA (Dead on Arrival) dalam 7 hari pembelian. Halaman 4: Ketentuan retur part lama ke vendor. Halaman 5: Standar Form Checklist Tanda Terima Customer.",
        isRequired: true,
        displayOrder: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: "mat-v-201",
        courseId: "course-mi-201",
        title: "Video Prosedur Teardown & Rekat Ulang Backcover",
        type: MaterialType.VIDEO,
        version: 1,
        fileKey: "videos/xiaomi-teardown-guide.mp4",
        durationSeconds: 420,
        sourceText: "Pemanasan heating mat diatur pada suhu maksimal 75 derajat Celcius selama 3 menit. Gunakan pick plastik tipis dan isopropil alkohol 99%. Jangan mencongkel di area kabel fleksibel tombol power atau antena NFC. Bersihkan sisa lem lama sebelum memasang lem gasket baru.",
        isRequired: true,
        displayOrder: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: "mat-p-301",
        courseId: "course-mi-301",
        title: "Skematik Jalur Daya & IC Power Xiaomi",
        type: MaterialType.PDF,
        version: 1,
        fileKey: "docs/xiaomi-power-schematics.pdf",
        totalPages: 4,
        sourceText: "Halaman 1: Diagram Blok VBUS 5V/9V/20V menuju PMIC. Halaman 2: Titik Pengukuran Test Point VREG_L19 dan VDD_CORE. Halaman 3: Nilai hambatan standar diode mode konektor baterai. Halaman 4: Prosedur kalibrasi sensor FOD (Fingerprint on Display) pasca penggantian modul AMOLED.",
        isRequired: true,
        displayOrder: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    // 8. Grounded Exams & Questions
    this.exams = [
      {
        id: "exam-mi-week-1",
        weekId: "week-mi-1",
        title: "Ujian Evaluasi Week 1 — SOP & ESD Safety",
        description: "Ujian kelulusan materi dasar SOP penerimaan unit, validasi garansi, dan keselamatan kerja laboratorium.",
        passingScore: 80,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        cooldownMinutes: 15,
        version: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "exam-mi-week-2",
        weekId: "week-mi-2",
        title: "Ujian Evaluasi Week 2 — Hardware Teardown",
        description: "Evaluasi pemahaman teknik pembongkaran aman dan penanganan komponen sensitif.",
        passingScore: 80,
        timeLimitMinutes: 30,
        maxAttempts: 3,
        cooldownMinutes: 15,
        version: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "exam-mi-week-3",
        weekId: "week-mi-3",
        title: "Ujian Evaluasi Week 3 — Sirkuit Daya & AMOLED",
        description: "Ujian analisis skematik kelistrikan dan kalibrasi sensor optik.",
        passingScore: 80,
        timeLimitMinutes: 40,
        maxAttempts: 3,
        cooldownMinutes: 30,
        version: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    // Grounded Questions
    this.examQuestions = [
      // Week 1 Exam Questions
      {
        id: "q-mi-101",
        examId: "exam-mi-week-1",
        examVersion: 1,
        questionText: "Berapa batas waktu maksimal pelaporan klaim unit DOA (Dead on Arrival) sejak tanggal pembelian?",
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficulty: QuestionDifficulty.EASY,
        options: [
          { id: "opt-1", optionText: "3 Hari", isCorrect: false },
          { id: "opt-2", optionText: "7 Hari", isCorrect: true },
          { id: "opt-3", optionText: "14 Hari", isCorrect: false },
          { id: "opt-4", optionText: "30 Hari", isCorrect: false },
        ],
        explanation: "Sesuai Buku Pedoman Garansi Xiaomi Halaman 3, klaim pergantian unit DOA berlaku dalam 7 hari sejak tanggal pembelian.",
        sourceGrounding: {
          materialId: "mat-p-101",
          materialVersion: 1,
          excerptSnippet: "Prosedur pergantian unit DOA (Dead on Arrival) dalam 7 hari pembelian.",
        },
      },
      {
        id: "q-mi-102",
        examId: "exam-mi-week-1",
        examVersion: 1,
        questionText: "Manakah kondisi berikut yang menyebabkan garansi resmi unit Xiaomi menjadi VOID (hangus)?",
        questionType: QuestionType.MULTIPLE_ANSWER,
        difficulty: QuestionDifficulty.MEDIUM,
        options: [
          { id: "opt-21", optionText: "Indikator Liquid Damage Indicator (LDI) berubah menjadi warna merah", isCorrect: true },
          { id: "opt-22", optionText: "Sticker tamper pada baut motherboard rusak atau hilang", isCorrect: true },
          { id: "opt-23", optionText: "Pengguna melakukan update OTA resmi", isCorrect: false },
          { id: "opt-24", optionText: "Terdapat modifikasi hardware tidak resmi", isCorrect: true },
        ],
        explanation: "LDI merah, kerusakan tamper sticker, dan modifikasi tidak resmi membatalkan garansi vendor.",
        sourceGrounding: {
          materialId: "mat-p-101",
          materialVersion: 1,
          excerptSnippet: "Void Garansi akibat cairan (Liquid Damage Indicator berubah merah)... status tamper sticker pada baut motherboard.",
        },
      },
      {
        id: "q-mi-103",
        examId: "exam-mi-week-1",
        examVersion: 1,
        questionText: "Teknisi diperbolehkan membongkar unit tanpa menggunakan gelang anti-statis (ESD wrist strap) jika lab memiliki AC.",
        questionType: QuestionType.TRUE_FALSE,
        difficulty: QuestionDifficulty.EASY,
        options: [
          { id: "opt-31", optionText: "Benar", isCorrect: false },
          { id: "opt-32", optionText: "Salah", isCorrect: true },
        ],
        explanation: "Penggunaan gelang anti-statis (ESD) wajib dilakukan tanpa pengecualian untuk mencegah kerusakan electrostatic discharge.",
        sourceGrounding: {
          materialId: "mat-v-101",
          materialVersion: 1,
          excerptSnippet: "Standar keselamatan laboratorium mewajibkan pencegahan electrostatic discharge.",
        },
      },
      // Week 2 Exam Questions
      {
        id: "q-mi-201",
        examId: "exam-mi-week-2",
        examVersion: 1,
        questionText: "Berapa batas suhu maksimal pemanasan heating mat untuk pelepasan backcover?",
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficulty: QuestionDifficulty.EASY,
        options: [
          { id: "opt-w2-1", optionText: "75 Derajat Celcius", isCorrect: true },
          { id: "opt-w2-2", optionText: "120 Derajat Celcius", isCorrect: false },
          { id: "opt-w2-3", optionText: "150 Derajat Celcius", isCorrect: false },
        ],
        explanation: "Pemanasan heating mat dibatasi maksimal 75 derajat Celcius untuk mencegah deformasi baterai.",
        sourceGrounding: {
          materialId: "mat-v-201",
          materialVersion: 1,
          excerptSnippet: "Pemanasan heating mat diatur pada suhu maksimal 75 derajat Celcius.",
        },
      },
      {
        id: "q-mi-202",
        examId: "exam-mi-week-2",
        examVersion: 1,
        questionText: "Zat pelarut lem perekat yang aman digunakan di lab servis resmi adalah Isopropil Alkohol 99%.",
        questionType: QuestionType.TRUE_FALSE,
        difficulty: QuestionDifficulty.EASY,
        options: [
          { id: "opt-w2-21", optionText: "Benar", isCorrect: true },
          { id: "opt-w2-22", optionText: "Salah", isCorrect: false },
        ],
        explanation: "IPA 99% aman untuk melarutkan residu lem tanpa meninggalkan residu korosif.",
        sourceGrounding: {
          materialId: "mat-v-201",
          materialVersion: 1,
          excerptSnippet: "Gunakan pick plastik tipis dan isopropil alkohol 99%.",
        },
      },
    ];

    // 9. Trainee Assignments (Andi Pratama assigned to Xiaomi Tech)
    this.assignments = [
      {
        id: "asg-andi-1",
        userId: "usr-staff-1",
        programId: "prog-xiaomi-tech",
        trainerId: "usr-trainer-1",
        startDate: "2026-08-01T00:00:00.000Z",
        deadlineDate: "2026-08-28T23:59:59.000Z",
        status: TrainingAssignmentStatus.IN_PROGRESS,
        courseProgressPercentage: 75,
        examProgressPercentage: 55,
        overallProgressPercentage: calculateOverallProgress(75, 55),
        averageScore: 87.5,
        passRatePercentage: 100,
        createdAt: "2026-08-01T08:00:00.000Z",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "asg-bambang-1",
        userId: "usr-staff-2",
        programId: "prog-xiaomi-tech",
        trainerId: "usr-trainer-1",
        startDate: "2026-07-01T00:00:00.000Z",
        deadlineDate: "2026-07-28T23:59:59.000Z",
        status: TrainingAssignmentStatus.COMPLETED,
        completedAt: "2026-07-26T15:30:00.000Z",
        courseProgressPercentage: 100,
        examProgressPercentage: 100,
        overallProgressPercentage: 100,
        averageScore: 94.0,
        passRatePercentage: 100,
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-26T15:30:00.000Z",
      },
    ];

    // 10. Material Progress for Andi Pratama
    this.materialProgress = [
      {
        id: "prog-andi-m1",
        assignmentId: "asg-andi-1",
        materialId: "mat-v-101",
        materialVersion: 1,
        status: LearningStatus.COMPLETED,
        percentage: 100,
        watchedSegments: [{ start: 0, end: 300 }],
        visitedPages: [],
        lastPositionSeconds: 300,
        completedAt: "2026-08-02T10:15:00.000Z",
        updatedAt: "2026-08-02T10:15:00.000Z",
      },
      {
        id: "prog-andi-m2",
        assignmentId: "asg-andi-1",
        materialId: "mat-p-101",
        materialVersion: 1,
        status: LearningStatus.COMPLETED,
        percentage: 100,
        watchedSegments: [],
        visitedPages: [1, 2, 3, 4, 5],
        completedAt: "2026-08-03T11:00:00.000Z",
        updatedAt: "2026-08-03T11:00:00.000Z",
      },
      {
        id: "prog-andi-m3",
        assignmentId: "asg-andi-1",
        materialId: "mat-v-201",
        materialVersion: 1,
        status: LearningStatus.COMPLETED,
        percentage: 100,
        watchedSegments: [{ start: 0, end: 420 }],
        visitedPages: [],
        lastPositionSeconds: 420,
        completedAt: "2026-08-09T14:20:00.000Z",
        updatedAt: "2026-08-09T14:20:00.000Z",
      },
      {
        id: "prog-andi-m4",
        assignmentId: "asg-andi-1",
        materialId: "mat-p-301",
        materialVersion: 1,
        status: LearningStatus.IN_PROGRESS,
        percentage: 50,
        watchedSegments: [],
        visitedPages: [1, 2],
        updatedAt: new Date().toISOString(),
      },
    ];

    // 11. Exam Attempts
    this.examAttempts = [
      {
        id: "att-andi-1",
        assignmentId: "asg-andi-1",
        examId: "exam-mi-week-1",
        examVersion: 1,
        attemptNumber: 1,
        score: 90,
        correctCount: 3,
        totalQuestions: 3,
        isPassed: true,
        status: ExamStatus.PASSED,
        answers: [
          { questionId: "q-mi-101", selectedOptionIds: ["opt-2"], isCorrect: true },
          { questionId: "q-mi-102", selectedOptionIds: ["opt-21", "opt-22", "opt-24"], isCorrect: true },
          { questionId: "q-mi-103", selectedOptionIds: ["opt-32"], isCorrect: true },
        ],
        startedAt: "2026-08-04T09:00:00.000Z",
        submittedAt: "2026-08-04T09:18:00.000Z",
      },
    ];

    // 12. Audit Logs
    this.auditLogs = [
      {
        id: "aud-001",
        actorId: "usr-admin-1",
        actorEmail: "admin@unicom.co.id",
        actorRole: "SUPER_ADMIN",
        action: "INITIAL_DATABASE_BOOTSTRAP",
        resource: "SYSTEM",
        details: { initializedEntities: 28, multiBrandCount: 6 },
        ipAddress: "127.0.0.1",
        timestamp: new Date().toISOString(),
      },
    ];

    // 13. Notifications
    this.notifications = [
      {
        id: "notif-1",
        userId: "usr-staff-1",
        title: "Penugasan Training Baru",
        message: "Anda telah ditugaskan ke program Xiaomi Certified Technician Training. Selesaikan sebelum 28 Agustus 2026.",
        type: "ASSIGNMENT",
        linkUrl: "/training",
        isRead: false,
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      },
      {
        id: "notif-2",
        userId: "usr-staff-1",
        title: "Hasil Ujian Week 1",
        message: "Selamat! Anda Lulus Ujian Evaluasi Week 1 dengan skor 90/100.",
        type: "EXAM_GRADED",
        linkUrl: "/courses",
        isRead: false,
        createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      },
      {
        id: "notif-3",
        userId: "usr-admin-1",
        title: "Laporan Cohort Mingguan",
        message: "5 peserta baru telah menyelesaikan materi SOP & Garansi Week 1.",
        type: "SYSTEM",
        linkUrl: "/reports",
        isRead: false,
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
    ];

    this.logger.log(`✅ Database initialized: ${this.users.length} Users, ${this.brands.length} Brands, ${this.programs.length} Programs, ${this.materials.length} Materials, ${this.exams.length} Exams, ${this.notifications.length} Notifications.`);
  }

  // Audit Helper
  public logAudit(log: Omit<DBAuditLog, "id" | "timestamp">): void {
    const entry: DBAuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.auditLogs.unshift(entry);
    this.logger.log(`[AUDIT] [${entry.action}] by ${entry.actorEmail || "SYSTEM"} on ${entry.resource}`);
  }
}
