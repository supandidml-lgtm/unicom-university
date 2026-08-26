"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  Award,
  ShieldCheck,
  Calendar,
  CheckCircle,
  FileText,
  TrendingUp,
  Download,
  QrCode,
  Check,
} from "lucide-react";
import { EmployeeLearningPassport } from "@unicom/types";
import Link from "next/link";

export default function EmployeePassportPage() {
  const [passport, setPassport] = useState<EmployeeLearningPassport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPassport() {
      try {
        const res = await fetchApi<EmployeeLearningPassport>("/competency/passport/usr-staff-1");
        if (res) setPassport(res);
      } catch (err) {
        console.error("Gagal memuat paspor belajar:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPassport();
  }, []);

  const careerLevels = [
    { level: "FOUNDATION", title: "Level 1: Foundation Technician", minScore: 60 },
    { level: "BRAND_CERTIFIED", title: "Level 2: Brand Certified Technician", minScore: 70 },
    { level: "ADVANCED", title: "Level 3: Advanced Diagnostic Specialist", minScore: 80 },
    { level: "MASTER", title: "Level 4: Multi-Brand Master Technician", minScore: 85 },
    { level: "EXPERT", title: "Level 5: Technical Expert & Lead Assessor", minScore: 90 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Passport Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wider uppercase">
              <ShieldCheck size={16} />
              <span>Official Employee Credential & Learning Passport</span>
            </div>
            <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Paspor Belajar & Rekam Jejak Kompetensi Karyawan
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Dokumentasi terverifikasi atas seluruh sertifikasi prinsipal brand, evaluasi praktikum meja kerja, dan kemahiran teknis.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/20 active:scale-95 self-start"
          >
            <Download size={16} />
            <span>Ekspor Paspor PDF Resmi</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <span>Memuat paspor belajar digital karyawan...</span>
            </div>
          </div>
        ) : passport ? (
          <>
            {/* Identity Card Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 p-6 lg:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl shadow-lg shadow-blue-500/25">
                    {passport.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">{passport.fullName}</h2>
                      <span className="rounded-md bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-300">
                        {passport.passportId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {passport.jobProfile} · {passport.branchName} · NIK: <span className="font-mono text-white font-bold">{passport.nik}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Tingkat Kemahiran</p>
                    <p className="text-xl font-black text-white mt-0.5">{passport.competencyProfile.overallLevel}</p>
                    <p className="text-[10px] text-slate-400">Skor Agregat: {passport.competencyProfile.overallScore}%</p>
                  </div>

                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-center">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Jenjang Karier</p>
                    <p className="text-xl font-black text-white mt-0.5">{passport.currentCareerLevel}</p>
                    <p className="text-[10px] text-slate-400">Progres: {passport.careerProgressPercent}%</p>
                  </div>
                </div>
              </div>

              {/* Career Ladder Progression Bar */}
              <div className="space-y-2 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-blue-400" />
                    <span>Jalur Jenjang Karier Teknisi (Technician Career Ladder)</span>
                  </span>
                  <span className="font-mono font-bold text-blue-400">Tahap Aktif: {passport.currentCareerLevel}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
                  {careerLevels.map((lvl, idx) => {
                    const isPassed = passport.competencyProfile.overallScore >= lvl.minScore;
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3 text-xs transition-all ${
                          isPassed
                            ? "bg-blue-600/20 border-blue-500/40 text-white"
                            : "bg-slate-950/50 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase">{lvl.level}</span>
                          {isPassed && <Check size={14} className="text-emerald-400" />}
                        </div>
                        <p className="text-[11px] font-semibold mt-1">{lvl.title}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Min. Skor: {lvl.minScore}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Historical Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-1 shadow-lg">
                <p className="text-xs text-slate-400">Program Selesai</p>
                <p className="text-2xl font-black text-white">{passport.historicalStats.totalProgramsCompleted}</p>
                <p className="text-[10px] text-slate-400">Kurikulum Resmi Lulus</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-1 shadow-lg">
                <p className="text-xs text-slate-400">Ujian Teori Lulus</p>
                <p className="text-2xl font-black text-emerald-400">{passport.historicalStats.totalExamsPassed}</p>
                <p className="text-[10px] text-slate-400">Rata-Rata Skor: {passport.historicalStats.averageExamScore}%</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-1 shadow-lg">
                <p className="text-xs text-slate-400">Praktikum Meja Kerja</p>
                <p className="text-2xl font-black text-blue-400">{passport.historicalStats.totalPracticalPassed}</p>
                <p className="text-[10px] text-slate-400">Tingkat Lulus: {passport.historicalStats.practicalPassRate}%</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-1 shadow-lg">
                <p className="text-xs text-slate-400">Sertifikat Resmi</p>
                <p className="text-2xl font-black text-amber-400">{passport.certifications.length}</p>
                <p className="text-[10px] text-slate-400">Brand Partner Terverifikasi</p>
              </div>
            </div>

            {/* Verified Certifications Badges */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award size={20} className="text-amber-400" />
                Lencana Sertifikasi Brand Resmi
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {passport.certifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-[11px] font-bold text-amber-300">
                        {cert.brandName} Certified
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{cert.certificateNumber}</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{cert.programTitle}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar size={12} />
                        Diterbitkan: {new Date(cert.issuedAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400">Nilai: {cert.finalScore}/100</span>
                      <Link
                        href={`/verify/${cert.verificationToken}`}
                        target="_blank"
                        className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                      >
                        <QrCode size={12} />
                        Verifikasi QR
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Immutable Activity & Audit Log */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText size={20} className="text-blue-400" />
                Rekam Jejak Aktivitas & Pencapaian Abadi (Immutable Log)
              </h3>

              <div className="divide-y divide-slate-800/60">
                {passport.immutableActivityLog.map((log) => (
                  <div key={log.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <CheckCircle size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-white">{log.targetTitle}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Tindakan: <span className="font-mono text-blue-300">{log.action}</span> · Pelaksana: {log.actor}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {log.score && <span className="font-black text-emerald-400 font-mono">Skor: {log.score}</span>}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(log.timestamp).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
