"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ContinueLearningBanner } from "@/components/dashboard/ContinueLearningBanner";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { Badge } from "@unicom/ui";
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <AppShell pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Welcome & Context Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Selamat Pagi, Andi Pratama
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Cabang Jakarta • Posisi: Technician • Assignment: Xiaomi Training Track
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Status Akun:</span>
            <Badge variant="success" dot size="sm">
              ACTIVE
            </Badge>
          </div>
        </div>

        {/* High-Information Density Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Overall Progress"
            value="68%"
            badge={<Badge variant="default">On Track</Badge>}
            subtext="Bobot: 60% Course + 40% Exam"
            icon={<GraduationCap className="w-5 h-5 text-blue-600" />}
          />

          <MetricCard
            label="Course Progress"
            value="75%"
            badge={<Badge variant="success">9/12 Materi</Badge>}
            subtext="3 Materi tersisa di Week 3"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          />

          <MetricCard
            label="Rata-rata Nilai Exam"
            value="87.5"
            badge={<Badge variant="success">Passing: 80</Badge>}
            subtext="Lulus 3 dari 3 Exam disubmit"
            icon={<Award className="w-5 h-5 text-purple-600" />}
          />

          <MetricCard
            label="Sisa Waktu Training"
            value="7 Hari"
            badge={<Badge variant="warning">Deadline 28 Ags</Badge>}
            subtext="Target penyelesaian Week 4"
            icon={<Clock className="w-5 h-5 text-amber-600" />}
          />
        </div>

        {/* Actionable Learning Block */}
        <ContinueLearningBanner />

        {/* Two-Column Structured Operational Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activity Table (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[8px] p-5 shadow-sm">
            <RecentActivityTable />
          </div>

          {/* Side Overview: Weekly Training Path (1 Col) */}
          <div className="bg-white border border-slate-200 rounded-[8px] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Struktur Minggu Training
              </h3>
              <Badge variant="neutral" size="sm">4 Minggu</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-[6px] bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-emerald-950">Minggu 1 — Onboarding & SOP</span>
                  <p className="text-emerald-700">4 Course • Exam Skor 90</p>
                </div>
                <Badge variant="success" size="sm">Selesai</Badge>
              </div>

              <div className="p-3 rounded-[6px] bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-emerald-950">Minggu 2 — Hardware Diagnostics</span>
                  <p className="text-emerald-700">4 Course • Exam Skor 85</p>
                </div>
                <Badge variant="success" size="sm">Selesai</Badge>
              </div>

              <div className="p-3 rounded-[6px] bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-blue-950">Minggu 3 — Motherboard & AMOLED</span>
                  <p className="text-blue-700">3 Course • Exam Tersedia</p>
                </div>
                <Badge variant="default" size="sm">Aktif</Badge>
              </div>

              <div className="p-3 rounded-[6px] bg-slate-50 border border-slate-200 opacity-60 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-700">Minggu 4 — Final Assessment</span>
                  <p className="text-slate-500">2 Course • Comprehensive Exam</p>
                </div>
                <Badge variant="neutral" size="sm">Terkunci</Badge>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Grounded AI Exam aktif untuk semua materi valid</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
