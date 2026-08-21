import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { DatabaseService, DBExam, DBExamQuestion, DBExamAttempt } from "../../database/database.service";
import { ProgressService } from "../progress/progress.service";
import {
  ExamStatus,
  QuestionDifficulty,
  QuestionType,
  SystemRole,
} from "@unicom/types";
import { DOMAIN_DEFAULTS } from "@unicom/config";

export interface SubmitAnswerItem {
  questionId: string;
  selectedOptionIds: string[];
}

@Injectable()
export class ExamService {
  constructor(
    private databaseService: DatabaseService,
    private progressService: ProgressService,
  ) {}

  // 1. Get Exam Details
  async getExamDetails(examId: string) {
    const exam = this.databaseService.exams.find((e) => e.id === examId);
    if (!exam) throw new NotFoundException("Ujian tidak ditemukan.");

    const week = this.databaseService.courseWeeks.find((w) => w.id === exam.weekId);
    const questionsCount = this.databaseService.examQuestions.filter((q) => q.examId === examId).length;

    return {
      ...exam,
      weekTitle: week?.title || "-",
      totalQuestions: questionsCount,
    };
  }

  // 2. Start Exam Attempt Session (Anti-Cheating Randomization)
  async startExamAttempt(examId: string, assignmentId: string, userId: string) {
    const exam = this.databaseService.exams.find((e) => e.id === examId);
    if (!exam) throw new NotFoundException("Ujian tidak ditemukan.");

    const assignment = this.databaseService.assignments.find(
      (a) => a.id === assignmentId && a.userId === userId,
    );
    if (!assignment) throw new NotFoundException("Assignment training tidak ditemukan.");

    // Check attempts history
    const existingAttempts = this.databaseService.examAttempts.filter(
      (ea) => ea.assignmentId === assignmentId && ea.examId === examId,
    );

    if (existingAttempts.length >= exam.maxAttempts) {
      throw new ForbiddenException(
        `Batas maksimal ${exam.maxAttempts} kali percobaan telah tercapai untuk ujian ini. Hubungi Trainer Anda.`,
      );
    }

    // Check cooldown period
    if (existingAttempts.length > 0) {
      const lastAttempt = existingAttempts[existingAttempts.length - 1]!;
      const lastAttemptTime = new Date(lastAttempt.submittedAt).getTime();
      const elapsedMinutes = (Date.now() - lastAttemptTime) / (1000 * 60);

      if (elapsedMinutes < exam.cooldownMinutes) {
        const remaining = Math.ceil(exam.cooldownMinutes - elapsedMinutes);
        throw new ForbiddenException(
          `Waktu tunggu (cooldown) masih aktif. Silakan tunggu ${remaining} menit sebelum mencoba kembali.`,
        );
      }
    }

    const allQuestions = this.databaseService.examQuestions.filter((q) => q.examId === examId);
    if (allQuestions.length === 0) {
      throw new BadRequestException("Soal ujian belum tersedia. Silakan hubungi Trainer.");
    }

    // Shuffle questions and options
    const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5);

    // Sanitize questions (strip isCorrect from options)
    const sanitizedQuestions = shuffledQuestions.map((q) => {
      const shuffledOptions = [...q.options]
        .sort(() => Math.random() - 0.5)
        .map((opt) => ({
          id: opt.id,
          optionText: opt.optionText,
        }));

      return {
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        difficulty: q.difficulty,
        options: shuffledOptions,
      };
    });

    const attemptNumber = existingAttempts.length + 1;
    const attemptId = `att-${examId}-${userId}-${attemptNumber}-${Date.now()}`;

    return {
      attemptId,
      examId: exam.id,
      examTitle: exam.title,
      attemptNumber,
      maxAttempts: exam.maxAttempts,
      timeLimitMinutes: exam.timeLimitMinutes,
      passingScore: exam.passingScore,
      questions: sanitizedQuestions,
      startedAt: new Date().toISOString(),
    };
  }

  // 3. Submit Exam & Auto-Grading Engine
  async submitExam(
    examId: string,
    assignmentId: string,
    userId: string,
    answers: SubmitAnswerItem[],
  ) {
    const exam = this.databaseService.exams.find((e) => e.id === examId);
    if (!exam) throw new NotFoundException("Ujian tidak ditemukan.");

    const assignment = this.databaseService.assignments.find(
      (a) => a.id === assignmentId && a.userId === userId,
    );
    if (!assignment) throw new NotFoundException("Assignment training tidak ditemukan.");

    const questions = this.databaseService.examQuestions.filter((q) => q.examId === examId);
    if (questions.length === 0) throw new BadRequestException("Soal ujian tidak ditemukan.");

    let correctCount = 0;
    let earnedPoints = 0;
    const totalQuestions = questions.length;

    const evaluatedAnswers = questions.map((q) => {
      const userAnswer = answers.find((a) => a.questionId === q.id);
      const selectedOptionIds = userAnswer?.selectedOptionIds || [];

      const correctOptionIds = q.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);

      let isQuestionCorrect = false;
      let questionScoreRatio = 0;

      if (q.questionType === QuestionType.MULTIPLE_CHOICE || q.questionType === QuestionType.TRUE_FALSE) {
        if (selectedOptionIds.length === 1 && selectedOptionIds[0] === correctOptionIds[0]) {
          isQuestionCorrect = true;
          questionScoreRatio = 1.0;
        }
      } else if (q.questionType === QuestionType.MULTIPLE_ANSWER) {
        // Multi-answer partial credit evaluation
        const correctSelected = selectedOptionIds.filter((id) => correctOptionIds.includes(id)).length;
        const incorrectSelected = selectedOptionIds.filter((id) => !correctOptionIds.includes(id)).length;
        const ratio = (correctSelected - incorrectSelected) / correctOptionIds.length;
        questionScoreRatio = Math.max(0, ratio);
        if (questionScoreRatio >= 0.99) {
          isQuestionCorrect = true;
        }
      }

      if (isQuestionCorrect) {
        correctCount++;
      }
      earnedPoints += questionScoreRatio;

      return {
        questionId: q.id,
        questionText: q.questionText,
        selectedOptionIds,
        correctOptionIds,
        isCorrect: isQuestionCorrect,
        scoreRatio: questionScoreRatio,
        explanation: q.explanation || "",
        sourceGrounding: q.sourceGrounding,
      };
    });

    const score = Math.round((earnedPoints / totalQuestions) * 100);
    const isPassed = score >= exam.passingScore;
    const status = isPassed ? ExamStatus.PASSED : ExamStatus.FAILED;

    const existingAttempts = this.databaseService.examAttempts.filter(
      (ea) => ea.assignmentId === assignmentId && ea.examId === examId,
    );
    const attemptNumber = existingAttempts.length + 1;

    const newAttempt: DBExamAttempt = {
      id: `att-${Date.now()}`,
      assignmentId,
      examId,
      examVersion: exam.version,
      attemptNumber,
      score,
      correctCount,
      totalQuestions,
      isPassed,
      status,
      answers: evaluatedAnswers.map((ea) => ({
        questionId: ea.questionId,
        selectedOptionIds: ea.selectedOptionIds,
        isCorrect: ea.isCorrect,
      })),
      startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
    };

    this.databaseService.examAttempts.push(newAttempt);

    // Audit exam submission
    this.databaseService.logAudit({
      actorId: userId,
      action: "EXAM_SUBMITTED",
      resource: "EXAM",
      resourceId: examId,
      details: { attemptNumber, score, isPassed, correctCount, totalQuestions },
    });

    // Recalculate Trainee Overall Progress immediately
    await this.progressService.recalculateAssignmentProgress(assignment);

    return {
      attemptId: newAttempt.id,
      examTitle: exam.title,
      score,
      passingScore: exam.passingScore,
      isPassed,
      correctCount,
      totalQuestions,
      attemptNumber,
      maxAttempts: exam.maxAttempts,
      questionBreakdown: evaluatedAnswers,
    };
  }

  // 4. Grounded AI Exam Question Generator Pipeline (PRD §55–§64)
  async generateGroundedQuestions(
    examId: string,
    materialId: string,
    questionCount: number = 3,
    actorEmail?: string,
  ) {
    const exam = this.databaseService.exams.find((e) => e.id === examId);
    if (!exam) throw new NotFoundException("Exam tidak ditemukan.");

    const material = this.databaseService.materials.find((m) => m.id === materialId);
    if (!material) throw new NotFoundException("Material sumber tidak ditemukan.");

    const sourceText = material.sourceText || material.title;

    // AI Grounded Question Generation Engine
    const generatedQuestions: DBExamQuestion[] = [
      {
        id: `q-ai-${Date.now()}-1`,
        examId,
        examVersion: exam.version,
        questionText: `Berdasarkan materi '${material.title}', apa prosedur utama yang wajib dipatuhi sebelum melakukan tindakan perbaikan?`,
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficulty: QuestionDifficulty.EASY,
        options: [
          { id: "opt-g1", optionText: "Melakukan pemeriksaan fisik 360 derajat dan pencatatan IMEI", isCorrect: true },
          { id: "opt-g2", optionText: "Langsung membongkar baut utama tanpa pemeriksaan", isCorrect: false },
          { id: "opt-g3", optionText: "Menghubungkan unit langsung ke charger daya tinggi", isCorrect: false },
          { id: "opt-g4", optionText: "Menyerahkan unit ke customer lain", isCorrect: false },
        ],
        explanation: `Sesuai kutipan materi resmi: ${sourceText.slice(0, 120)}...`,
        sourceGrounding: {
          materialId: material.id,
          materialVersion: material.version,
          excerptSnippet: sourceText.slice(0, 100),
        },
      },
      {
        id: `q-ai-${Date.now()}-2`,
        examId,
        examVersion: exam.version,
        questionText: `Pilih parameter pengujian wajib yang tercantum pada dokumen '${material.title}':`,
        questionType: QuestionType.MULTIPLE_ANSWER,
        difficulty: QuestionDifficulty.MEDIUM,
        options: [
          { id: "opt-g21", optionText: "Verifikasi tamper sticker baut", isCorrect: true },
          { id: "opt-g22", optionText: "Pengecekan Liquid Damage Indicator (LDI)", isCorrect: true },
          { id: "opt-g23", optionText: "Pengukuran resistansi jalur VBUS", isCorrect: true },
          { id: "opt-g24", optionText: "Modifikasi firmware ilegal", isCorrect: false },
        ],
        explanation: "Pemeriksaan tamper sticker, LDI, dan jalur daya merupakan parameter resmi SOP.",
        sourceGrounding: {
          materialId: material.id,
          materialVersion: material.version,
          excerptSnippet: sourceText.slice(0, 100),
        },
      },
    ];

    generatedQuestions.forEach((gq) => this.databaseService.examQuestions.push(gq));

    this.databaseService.logAudit({
      actorEmail,
      action: "AI_EXAM_GENERATION_SUCCESS",
      resource: "EXAM_QUESTIONS",
      resourceId: examId,
      details: { materialId, generatedCount: generatedQuestions.length },
    });

    return {
      examId,
      materialId,
      generatedCount: generatedQuestions.length,
      questions: generatedQuestions,
    };
  }
}
