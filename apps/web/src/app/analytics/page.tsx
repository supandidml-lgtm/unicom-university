"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  BarChart3,
  Building2,
  Award,
  AlertCircle,
  CheckCircle,
  Download,
} from "lucide-react";
import { MultiBranchAnalytics } from "@unicom/types";

export default function AnalyticsPage() {
  const [data, setData] = useState<MultiBranchAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetchApi<MultiBranchAnalytics>("/reports/multi-branch");
        if (res) setData(res);
      } catch (err) {
        console.error("Gagal memuat analitik:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 tracking-wider uppercase">
              <BarChart3 size={16} />
              <span>Analitik Eksekutif UNICOM University V1.1</span>
            </div>
            <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Performa Pelatihan & Kelulusan Lintas Cabang
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Pemantauan komparatif tingkat kelulusan, sertifikasi per brand, dan kesehatan cohort operasional.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors shadow-sm self-start"
          >
            <Download size={16} />
            <span>Ekspor Laporan Eksekutif</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span>Mengagregasi data analitik lintas cabang...</span>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    On-Track Learners
                  </span>
                  <CheckCircle size={18} className="text-emerald-400" />
                </div>
                <p className="text-3xl font-black text-white">{data.cohortHealth.onTrack}</p>
                <p className="text-[11px] text-slate-400">Progres mingguan sesuai target kurikulum</p>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    At-Risk Trainees
                  </span>
                  <AlertCircle size={18} className="text-amber-400" />
                </div>
                <p className="text-3xl font-black text-white">{data.cohortHealth.atRisk}</p>
                <p className="text-[11px] text-slate-400">Tertinggal &gt; 3 hari dari jadwal</p>
              </div>

              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 shadow-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                    Overdue Cases
                  </span>
                  <AlertCircle size={18} className="text-rose-400" />
                </div>
                <p className="text-3xl font-black text-white">{data.cohortHealth.overdue}</p>
                <p className="text-[11px] text-slate-400">Melewati batas tenggat waktu ujian</p>
              </div>
            </div>

            {/* Branch Comparison Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 size={20} className="text-cyan-400" />
                Komparasi Kinerja Service Center per Cabang
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="pb-3 font-semibold">Nama Service Center</th>
                      <th className="pb-3 font-semibold text-center">Total Staf</th>
                      <th className="pb-3 font-semibold text-center">Peserta Aktif</th>
                      <th className="pb-3 font-semibold text-center">Completion Rate</th>
                      <th className="pb-3 font-semibold text-center">Nilai Rata-Rata</th>
                      <th className="pb-3 font-semibold text-center">Tingkat Kelulusan</th>
                      <th className="pb-3 font-semibold text-right">Status Kesehatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.branches.map((b) => (
                      <tr key={b.branchId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 font-bold text-white flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-cyan-400" />
                          <span>{b.branchName}</span>
                        </td>
                        <td className="py-3.5 text-center text-slate-300">{b.totalStaff}</td>
                        <td className="py-3.5 text-center text-slate-300">{b.activeTrainees}</td>
                        <td className="py-3.5 text-center">
                          <span className="font-bold text-white">{b.completionRate}%</span>
                        </td>
                        <td className="py-3.5 text-center font-mono font-bold text-amber-400">
                          {b.averageScore}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                            {b.passRate}%
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          {b.overdueCount > 0 ? (
                            <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                              {b.overdueCount} Overdue
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              Optimal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Brand Performance Grid */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Award size={20} className="text-amber-400" />
                Sebaran Sertifikasi per Ekosistem Brand
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.brandPerformance.map((br) => (
                  <div
                    key={br.brandId}
                    className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{br.brandName}</h3>
                      <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                        {br.enrolledCount} Terdaftar
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400">Sertifikat Diterbitkan:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {br.certifiedCount} Teknisi
                      </span>
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
