"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  UserCheck,
  CheckCircle,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { SupervisorCoachingPlan, SkillCategory } from "@unicom/types";

export default function SupervisorCoachingPage() {
  const [plans, setPlans] = useState<SupervisorCoachingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [userId, setUserId] = useState("usr-staff-2");
  const [weakCompetency, setWeakCompetency] = useState<SkillCategory>(SkillCategory.HARDWARE);
  const [gapScore, setGapScore] = useState<number>(25);
  const [coachingTopic, setCoachingTopic] = useState("");
  const [assignedTrainerId, setAssignedTrainerId] = useState("usr-trainer-1");
  const [targetDate, setTargetDate] = useState("2026-09-30");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reassessment State
  const [selectedPlanForReassess, setSelectedPlanForReassess] = useState<SupervisorCoachingPlan | null>(null);
  const [reassessScore, setReassessScore] = useState<number>(85);
  const [reassessNotes, setReassessNotes] = useState("");

  const loadPlans = async () => {
    try {
      const res = await fetchApi<SupervisorCoachingPlan[]>("/coaching/branch/ALL");
      if (res) setPlans(res);
    } catch (err) {
      console.error("Gagal memuat rencana coaching:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await fetchApi<SupervisorCoachingPlan>("/coaching/plan", {
        method: "POST",
        body: JSON.stringify({
          userId,
          supervisorId: "usr-spv-1",
          weakCompetency,
          gapScore,
          coachingTopic: coachingTopic || "Bimbingan Meja Kerja Khusus & Pengukuran Multimeter",
          assignedTrainerId,
          targetDate,
          notes,
        }),
      });

      setShowModal(false);
      setCoachingTopic("");
      setNotes("");
      loadPlans();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      alert("Gagal membuat rencana coaching: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForReassess) return;
    setIsSubmitting(true);

    try {
      await fetchApi<SupervisorCoachingPlan>("/coaching/reassess", {
        method: "POST",
        body: JSON.stringify({
          planId: selectedPlanForReassess.id,
          reassessmentScore: reassessScore,
          notes: reassessNotes,
        }),
      });

      setSelectedPlanForReassess(null);
      loadPlans();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      alert("Gagal merekam asesmen ulang: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 tracking-wider uppercase">
              <UserCheck size={16} />
              <span>Sistem Pendampingan Teknis & Coaching Supervisor</span>
            </div>
            <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Rencana Bimbingan & Peningkatan Kompetensi
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Intervensi terarah bagi teknisi dengan kesenjangan keahlian (*Competency Gap*) melalui bimbingan instruktur langsung.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-blue-500/20 active:scale-95 self-start"
          >
            <PlusCircle size={16} />
            <span>+ Buat Rencana Bimbingan</span>
          </button>
        </div>

        {/* Plans List */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <span>Memuat data rencana coaching...</span>
            </div>
          </div>
        ) : plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-sm font-bold text-white">{plan.userName}</h3>
                    <span className="text-xs text-blue-400 font-mono">[{plan.userNik}]</span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      plan.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Topik Bimbingan:</span>
                    <p className="font-semibold text-white mt-0.5">{plan.coachingTopic}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400">Aspek Lemah:</span>
                      <p className="font-bold text-rose-400">{plan.weakCompetency}</p>
                      <p className="text-[10px] text-slate-400">Gap Target: -{plan.gapScore}%</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400">Trainer Pembimbing:</span>
                      <p className="font-medium text-slate-200">{plan.assignedTrainerName}</p>
                      <p className="text-[10px] text-slate-400">Target: {plan.targetDate}</p>
                    </div>
                  </div>

                  {plan.notes && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-300">
                      <span className="font-semibold text-purple-400">Catatan:</span> {plan.notes}
                    </div>
                  )}

                  {plan.reassessmentScore && (
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400 pt-1">
                      <span>Nilai Asesmen Ulang:</span>
                      <span className="font-mono text-sm">{plan.reassessmentScore} / 100</span>
                    </div>
                  )}
                </div>

                {plan.status !== "COMPLETED" && (
                  <button
                    onClick={() => {
                      setSelectedPlanForReassess(plan);
                      setReassessScore(85);
                    }}
                    className="w-full mt-2 rounded-xl bg-purple-600/20 border border-purple-500/30 py-2 text-xs font-bold text-purple-300 hover:bg-purple-600/30 transition-all text-center"
                  >
                    Rekam Asesmen Ulang (Reassessment)
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-3">
            <CheckCircle size={40} className="mx-auto text-emerald-400" />
            <h3 className="text-base font-bold text-white">Semua Teknisi Memenuhi Standar Kompetensi</h3>
            <p className="text-xs text-slate-400">Tidak ada intervensi pendampingan teknis yang diperlukan saat ini.</p>
          </div>
        )}

        {/* Create Plan Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-5 shadow-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle size={20} className="text-blue-400" />
                Buat Rencana Bimbingan Khusus (Coaching Plan)
              </h3>

              <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-300">Pilih Teknisi</label>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="usr-staff-1">Andi Pratama [NIK: UC10042] — Jakarta Pusat</option>
                    <option value="usr-staff-2">Bambang Wijaya [NIK: UC10043] — Surabaya</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300">Aspek Kompetensi Lemah</label>
                    <select
                      value={weakCompetency}
                      onChange={(e) => setWeakCompetency(e.target.value as SkillCategory)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="TROUBLESHOOTING">Troubleshooting</option>
                      <option value="HARDWARE">Hardware & Solder</option>
                      <option value="SOFTWARE">Software & Kalibrasi</option>
                      <option value="SOP">SOP & Garansi</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300">Target Tanggal Selesai</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300">Topik / Fokus Bimbingan</label>
                  <input
                    type="text"
                    value={coachingTopic}
                    onChange={(e) => setCoachingTopic(e.target.value)}
                    placeholder="Contoh: Praktik Kalibrasi Optical Fingerprint & Pengukuran PMIC"
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300">Catatan Observasi Supervisor</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tuliskan kendala yang dihadapi teknisi di meja servis..."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Rencana"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reassess Modal */}
        {selectedPlanForReassess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-slate-900 p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={20} className="text-purple-400" />
                Asesmen Ulang Hasil Bimbingan
              </h3>
              <p className="text-xs text-slate-400">
                Peserta: <span className="font-bold text-white">{selectedPlanForReassess.userName}</span> · Topik: {selectedPlanForReassess.coachingTopic}
              </p>

              <form onSubmit={handleReassess} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-300">Nilai Praktikum Pasca Coaching (0-100)</label>
                    <span className="font-bold text-emerald-400 font-mono">{reassessScore}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={reassessScore}
                    onChange={(e) => setReassessScore(Number(e.target.value))}
                    className="w-full mt-2 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Nilai minimal 75 untuk menyelesaikan status pendampingan.</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-300">Catatan Hasil Pengujian</label>
                  <textarea
                    rows={2}
                    value={reassessNotes}
                    onChange={(e) => setReassessNotes(e.target.value)}
                    placeholder="Tuliskan evaluasi perkembangan teknisi..."
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanForReassess(null)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-purple-600 px-4 py-2 font-bold text-white hover:bg-purple-500"
                  >
                    {isSubmitting ? "Merekam..." : "Simpan Nilai Asesmen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
