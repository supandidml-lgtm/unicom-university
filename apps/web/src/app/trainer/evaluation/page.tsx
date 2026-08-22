"use client";

import React, { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  Wrench,
  CheckCircle,
  Save,
  UserCheck,
  Calculator,
  PenTool,
} from "lucide-react";
import { PracticalEvaluation } from "@unicom/types";

export default function TrainerPracticalEvaluationPage() {
  const [userId, setUserId] = useState("usr-staff-1");
  const [courseId, setCourseId] = useState("course-1");
  const [esdScore, setEsdScore] = useState<number>(90);
  const [disassemblyScore, setDisassemblyScore] = useState<number>(85);
  const [diagnosisScore, setDiagnosisScore] = useState<number>(88);
  const [documentationScore, setDocumentationScore] = useState<number>(90);
  const [trainerNotes, setTrainerNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Weighted Calculation: ESD (20%) + Disassembly (30%) + Diagnosis (30%) + Documentation (20%)
  const liveTotalScore = Math.round(
    (esdScore * 0.2 + disassemblyScore * 0.3 + diagnosisScore * 0.3 + documentationScore * 0.2) * 10,
  ) / 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const res = await fetchApi<PracticalEvaluation>("/evaluations/practical", {
        method: "POST",
        body: JSON.stringify({
          userId,
          courseId,
          esdScore,
          disassemblyScore,
          diagnosisScore,
          documentationScore,
          trainerNotes: trainerNotes || "Evaluasi praktikum selesai memenuhi standar kelulusan meja kerja.",
        }),
      });

      if (res) {
        setSuccessMessage(`Evaluasi praktikum berhasil disimpan! Total Skor: ${res.totalScore}/100.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      alert("Gagal menyimpan evaluasi: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider uppercase">
            <Wrench size={16} />
            <span>Rubrik Penilaian Meja Kerja Pelatihan</span>
          </div>
          <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            Form Evaluasi Keterampilan Praktik Teknisi
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Penilaian objektif 4-indikator standar servis langsung di laboratorium pelatihan UNICOM.
          </p>
        </div>

        {successMessage && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300 flex items-center gap-2 shadow-lg">
            <CheckCircle size={18} className="text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Trainee Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck size={18} className="text-blue-400" />
              1. Pilih Peserta & Modul Praktikum
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Peserta Teknisi</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="usr-staff-1">Andi Pratama [NIK: UC10042] — Jakarta Pusat</option>
                  <option value="usr-staff-2">Bambang Wijaya [NIK: UC10043] — Surabaya</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Modul Praktikum</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="course-1">SOP & Kebijakan Garansi Xiaomi (Praktik)</option>
                  <option value="course-2">Diagnosa Sirkuit Daya & PMIC (Praktik Lab)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4 Rubric Sliders Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator size={18} className="text-amber-400" />
                2. Rubrik Penilaian Terstandarisasi (Skala 0 - 100)
              </h3>
              <span className="text-xs font-mono font-bold text-blue-400">
                Skor Akhir Terbobot: {liveTotalScore} / 100
              </span>
            </div>

            {/* Indicator 1: ESD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  A. Kepatuhan Standar Keselamatan Kerja & ESD <span className="text-slate-400 font-normal">(Bobot 20%)</span>
                </span>
                <span className="font-bold text-white font-mono">{esdScore}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={esdScore}
                onChange={(e) => setEsdScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[11px] text-slate-400">Penggunaan gelang antistatis, grounding matras, dan pemutus daya baterai.</p>
            </div>

            {/* Indicator 2: Disassembly */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  B. Kerapian & Kepatuhan SOP Pembongkaran <span className="text-slate-400 font-normal">(Bobot 30%)</span>
                </span>
                <span className="font-bold text-white font-mono">{disassemblyScore}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={disassemblyScore}
                onChange={(e) => setDisassemblyScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[11px] text-slate-400">Urutan pelepasan baut, penataan kabel fleksibel, dan suhu pemanas backcover.</p>
            </div>

            {/* Indicator 3: Diagnosis */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  C. Kecepatan & Akurasi Diagnosa Kerusakan <span className="text-slate-400 font-normal">(Bobot 30%)</span>
                </span>
                <span className="font-bold text-white font-mono">{diagnosisScore}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={diagnosisScore}
                onChange={(e) => setDiagnosisScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[11px] text-slate-400">Penggunaan multimeter, thermal imager, dan isolasi komponen short circuit.</p>
            </div>

            {/* Indicator 4: Documentation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  D. Kelengkapan Dokumentasi & Laporan Servis <span className="text-slate-400 font-normal">(Bobot 20%)</span>
                </span>
                <span className="font-bold text-white font-mono">{documentationScore}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={documentationScore}
                onChange={(e) => setDocumentationScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[11px] text-slate-400">Pengisian checklist komponen, foto bukti perbaikan, dan input sistem resmi.</p>
            </div>
          </div>

          {/* Notes Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PenTool size={18} className="text-purple-400" />
              3. Catatan & Rekomendasi Trainer
            </h3>
            <textarea
              rows={3}
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              placeholder="Tuliskan catatan observasi fisik, saran perbaikan teknik pembongkaran, atau rekomendasi..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all active:scale-95 disabled:opacity-50"
          >
            <Save size={18} />
            <span>{isSubmitting ? "Menyimpan Evaluasi..." : "Simpan & Rekam Nilai Praktikum"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
