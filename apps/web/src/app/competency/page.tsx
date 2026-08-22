"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  Sparkles,
  ShieldCheck,
  Award,
  Radar,
  Wrench,
  Cpu,
  FileText,
  MessageSquare,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { UserCompetencyProfile, SkillCategory, CompetencyLevel } from "@unicom/types";
import Link from "next/link";

export default function CompetencyPage() {
  const [profile, setProfile] = useState<UserCompetencyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetchApi<UserCompetencyProfile>("/competency/profile/usr-staff-1");
        if (res) setProfile(res);
      } catch (err) {
        console.error("Gagal memuat profil kompetensi:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const getLevelBadge = (level: CompetencyLevel) => {
    switch (level) {
      case CompetencyLevel.EXPERT:
        return { bg: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Expert / Master" };
      case CompetencyLevel.ADVANCED:
        return { bg: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Advanced" };
      case CompetencyLevel.INTERMEDIATE:
        return { bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Intermediate" };
      default:
        return { bg: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Beginner" };
    }
  };

  const getCategoryIcon = (cat: SkillCategory) => {
    switch (cat) {
      case SkillCategory.HARDWARE:
        return <Cpu size={16} className="text-blue-400" />;
      case SkillCategory.SOFTWARE:
        return <Wrench size={16} className="text-cyan-400" />;
      case SkillCategory.SOP:
        return <FileText size={16} className="text-emerald-400" />;
      case SkillCategory.TROUBLESHOOTING:
        return <Sparkles size={16} className="text-amber-400" />;
      case SkillCategory.CUSTOMER_SERVICE:
        return <MessageSquare size={16} className="text-purple-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider uppercase">
              <Radar size={16} />
              <span>Unicom University V1.1 Platform</span>
            </div>
            <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Profil Matriks Kompetensi Teknisi
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Pemetaan terukur tingkat keahlian servis per brand partner resmi UNICOM Service Center.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/certificates"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Award size={16} className="text-amber-400" />
              <span>Sertifikat Saya</span>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span>Memuat data matriks kompetensi teknisi...</span>
            </div>
          </div>
        ) : profile ? (
          <>
            {/* User Overview Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <p className="text-xs font-medium text-slate-400">Nama & NIK</p>
                <h3 className="mt-1 text-lg font-bold text-white">{profile.userName}</h3>
                <p className="text-xs text-blue-400 font-mono mt-0.5">NIK: {profile.userNik}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <p className="text-xs font-medium text-slate-400">Penugasan Cabang</p>
                <h3 className="mt-1 text-lg font-bold text-white">{profile.branchName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{profile.jobProfile}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <p className="text-xs font-medium text-slate-400">Skor Rata-Rata Agregat</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{profile.overallScore}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    style={{ width: `${profile.overallScore}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <p className="text-xs font-medium text-slate-400">Tingkat Kemahiran Global</p>
                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-xs ${getLevelBadge(profile.overallLevel).bg}`}>
                  <ShieldCheck size={16} />
                  <span>{getLevelBadge(profile.overallLevel).label}</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">Terverifikasi Standar UNICOM</p>
              </div>
            </div>

            {/* Brand Competency Cards Grid */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award size={20} className="text-blue-400" />
                Matriks Keahlian per Ekosistem Brand
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {profile.brandScores.map((brand) => (
                  <div
                    key={brand.brandId}
                    className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>{brand.brandName}</span>
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getLevelBadge(brand.level).bg}`}>
                            {getLevelBadge(brand.level).label}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Tingkat kemahiran servis perangkat resmi {brand.brandName}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-2xl font-black text-white">{brand.score}%</span>
                        <p className="text-[10px] text-slate-400">Skor Total</p>
                      </div>
                    </div>

                    {/* Category Breakdown Bars */}
                    <div className="space-y-3">
                      {brand.categories.map((cat, cIdx) => (
                        <div key={cIdx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-medium text-slate-300">
                              {getCategoryIcon(cat.category)}
                              <span>{cat.category}</span>
                            </span>
                            <span className="font-bold text-white">{cat.score}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                cat.score >= 85
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                  : cat.score >= 70
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-400"
                                  : "bg-gradient-to-r from-amber-500 to-orange-400"
                              }`}
                              style={{ width: `${cat.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <CheckCircle size={14} className="text-emerald-400" />
                        Teori & Praktik Terintegrasi
                      </span>
                      <Link
                        href={`/courses`}
                        className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                      >
                        Buka Modul Lanjutan
                        <ArrowRight size={12} />
                      </Link>
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
