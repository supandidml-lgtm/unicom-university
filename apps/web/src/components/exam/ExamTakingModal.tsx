"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Badge } from "@unicom/ui";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";

export interface ExamQuestion {
  id: string;
  questionText: string;
  questionType: "MULTIPLE_CHOICE" | "MULTIPLE_ANSWER" | "TRUE_FALSE";
  difficulty: string;
  options: Array<{ id: string; optionText: string }>;
}

export interface ExamResultBreakdown {
  questionText: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ExamResult {
  score: number;
  passingScore: number;
  isPassed: boolean;
  correctCount: number;
  totalQuestions: number;
  breakdown: ExamResultBreakdown[];
}

export interface ExamTakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle: string;
  timeLimitMinutes?: number;
  passingScore?: number;
  onSubmitted?: (result: ExamResult) => void;
}

export const ExamTakingModal: React.FC<ExamTakingModalProps> = ({
  isOpen,
  onClose,
  examTitle,
  timeLimitMinutes = 30,
  passingScore = 80,
  onSubmitted,
}) => {
  const [questions] = useState<ExamQuestion[]>([
    {
      id: "q-1",
      questionText: "Berapa batas waktu maksimal pelaporan klaim unit DOA (Dead on Arrival) sejak tanggal pembelian?",
      questionType: "MULTIPLE_CHOICE",
      difficulty: "EASY",
      options: [
        { id: "opt-1", optionText: "3 Hari" },
        { id: "opt-2", optionText: "7 Hari (SOP Resmi)" },
        { id: "opt-3", optionText: "14 Hari" },
        { id: "opt-4", optionText: "30 Hari" },
      ],
    },
    {
      id: "q-2",
      questionText: "Pilih kondisi yang menyebabkan garansi resmi unit Xiaomi menjadi VOID (hangus) — Pilih semua yang benar:",
      questionType: "MULTIPLE_ANSWER",
      difficulty: "MEDIUM",
      options: [
        { id: "opt-21", optionText: "Indikator Liquid Damage Indicator (LDI) berubah menjadi warna merah" },
        { id: "opt-22", optionText: "Sticker tamper pada baut motherboard rusak atau hilang" },
        { id: "opt-23", optionText: "Pengguna melakukan pengecekan IMEI resmi" },
        { id: "opt-24", optionText: "Terdapat modifikasi hardware tidak resmi" },
      ],
    },
    {
      id: "q-3",
      questionText: "Teknisi diperbolehkan membongkar unit tanpa menggunakan gelang anti-statis (ESD wrist strap) jika lab memiliki AC.",
      questionType: "TRUE_FALSE",
      difficulty: "EASY",
      options: [
        { id: "opt-31", optionText: "Benar" },
        { id: "opt-32", optionText: "Salah (Wajib Menggunakan Gelang ESD)" },
      ],
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(timeLimitMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || examResult) return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, examResult]);

  const currentQ = questions[currentIndex]!;

  const handleSelectOption = (questionId: string, optionId: string, isMulti: boolean) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMulti) {
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const handleSubmitExam = () => {
    setIsSubmitting(true);

    // Auto-grader logic simulation
    setTimeout(() => {
      const correctAnswers: Record<string, string[]> = {
        "q-1": ["opt-2"],
        "q-2": ["opt-21", "opt-22", "opt-24"],
        "q-3": ["opt-32"],
      };

      let correctCount = 0;
      let totalEarned = 0;

      const breakdown: ExamResultBreakdown[] = questions.map((q) => {
        const userAns = selectedAnswers[q.id] || [];
        const realAns = correctAnswers[q.id] || [];

        let isCorrect = false;
        if (q.questionType === "MULTIPLE_CHOICE" || q.questionType === "TRUE_FALSE") {
          isCorrect = userAns.length === 1 && userAns[0] === realAns[0];
        } else {
          const matchCount = userAns.filter((id) => realAns.includes(id)).length;
          const excessCount = userAns.filter((id) => !realAns.includes(id)).length;
          isCorrect = matchCount === realAns.length && excessCount === 0;
        }

        if (isCorrect) {
          correctCount++;
          totalEarned += 1;
        }

        return {
          questionText: q.questionText,
          isCorrect,
          explanation: "Jawaban tervalidasi sesuai Buku Pedoman Garansi dan Prosedur ESD Laboratorium Resmi Unicom.",
        };
      });

      const finalScore = Math.round((totalEarned / questions.length) * 100);
      const isPassed = finalScore >= passingScore;

      const result: ExamResult = {
        score: finalScore,
        passingScore,
        isPassed,
        correctCount,
        totalQuestions: questions.length,
        breakdown,
      };

      setExamResult(result);
      setIsSubmitting(false);
      if (onSubmitted) onSubmitted(result);
    }, 800);
  };

  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const answeredCount = Object.keys(selectedAnswers).filter((k) => (selectedAnswers[k]?.length || 0) > 0).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      {!examResult ? (
        <div className="space-y-6">
          {/* Exam Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="default" size="sm">Ujian Resmi</Badge>
                <Badge variant="neutral" size="sm">Passing Score: {passingScore}</Badge>
              </div>
              <h2 className="text-base md:text-lg font-bold text-slate-900">{examTitle}</h2>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-[6px] text-xs font-mono font-bold self-start sm:self-auto">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{minutes}:{seconds < 10 ? "0" : ""}{seconds}</span>
            </div>
          </div>

          {/* Question Palette Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {questions.map((q, idx) => {
                const isAnswered = (selectedAnswers[q.id]?.length || 0) > 0;
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-7 h-7 rounded-[4px] text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-blue-600 text-white ring-2 ring-blue-300"
                        : isAnswered
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Terjawab: {answeredCount} dari {questions.length} Soal
            </span>
          </div>

          {/* Question Viewport */}
          <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                Soal Nomor {currentIndex + 1} ({currentQ.questionType.replace("_", " ")})
              </span>
              <Badge variant="neutral" size="sm">{currentQ.difficulty}</Badge>
            </div>

            <h3 className="text-sm md:text-base font-semibold text-slate-900 leading-snug">
              {currentQ.questionText}
            </h3>

            {/* Options */}
            <div className="space-y-2.5 pt-2">
              {currentQ.options.map((opt) => {
                const isSelected = (selectedAnswers[currentQ.id] || []).includes(opt.id);
                const isMulti = currentQ.questionType === "MULTIPLE_ANSWER";

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ.id, opt.id, isMulti)}
                    className={`p-3.5 rounded-[6px] border text-sm cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-blue-50 border-blue-500 text-blue-950 font-medium ring-1 ring-blue-400"
                        : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50/80 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 shrink-0 rounded flex items-center justify-center ${
                        isMulti ? "rounded-[3px]" : "rounded-full"
                      } border ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="leading-relaxed">{opt.optionText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation & Submit Bar */}
          <div className="flex items-center justify-between pt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Sebelumnya
            </Button>

            {currentIndex < questions.length - 1 ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setCurrentIndex(currentIndex + 1)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Selanjutnya
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                isLoading={isSubmitting}
                onClick={handleSubmitExam}
                rightIcon={<Send className="w-4 h-4" />}
              >
                Submit Jawaban Ujian
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Result Evaluation Screen */
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 shadow-sm mb-2 bg-slate-50">
            {examResult.isPassed ? (
              <Award className="w-9 h-9 text-emerald-600" />
            ) : (
              <XCircle className="w-9 h-9 text-red-600" />
            )}
          </div>

          <div>
            <Badge variant={examResult.isPassed ? "success" : "danger"} size="md">
              {examResult.isPassed ? "LULUS UJIAN (PASSED)" : "BELUM LULUS (FAILED)"}
            </Badge>
            <h3 className="text-xl font-bold text-slate-900 mt-2">
              Skor Akhir: {examResult.score} / 100
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Standar kelulusan: {examResult.passingScore} • Benar: {examResult.correctCount} dari {examResult.totalQuestions} soal
            </p>
          </div>

          {/* Question Breakdown Review */}
          <div className="text-left space-y-3 max-h-60 overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-[8px]">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Review Penjelasan Soal:
            </h4>
            {examResult.breakdown.map((item, idx) => (
              <div key={idx} className="p-3 bg-white border border-slate-200 rounded-[6px] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  {item.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>Soal {idx + 1}: {item.questionText}</span>
                </div>
                <p className="text-slate-600 text-[11px] pl-5">{item.explanation}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <Button variant="primary" onClick={onClose}>
              Tutup & Simpan Progres
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
