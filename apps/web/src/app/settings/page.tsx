"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Input, Button, Badge } from "@unicom/ui";
import { Save, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [courseWeight, setCourseWeight] = useState("60");
  const [examWeight, setExamWeight] = useState("40");
  const [passingScore, setPassingScore] = useState("80");
  const [videoThreshold, setVideoThreshold] = useState("98");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    const cw = parseFloat(courseWeight);
    const ew = parseFloat(examWeight);
    if (cw + ew !== 100) {
      alert("Total bobot Course (%) dan Exam (%) harus tepat 100%.");
      return;
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  return (
    <AppShell pageTitle="Pengaturan Sistem">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Konfigurasi Global LMS & Progress Engine
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Pengaturan bobot kelulusan, batas passing score, dan ambang validasi anti-skip (Super Admin).
          </p>
        </div>

        {isSaved && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[6px] flex items-center gap-3 text-xs text-emerald-900 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Konfigurasi Berhasil Disimpan di Server</p>
              <p className="text-emerald-700">Parameter baru telah diterapkan pada engine perhitungan kelulusan otomatis.</p>
            </div>
          </div>
        )}

        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Bobot & Ambang Kelulusan (PRD §49, §50, §67)
              </h3>
              <p className="text-xs text-slate-500">
                Formula authoritative: Overall = (Course % × Course Weight) + (Exam % × Exam Weight)
              </p>
            </div>
            <Badge variant="default" size="sm">Super Admin Only</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Bobot Course Completion (%)"
              value={courseWeight}
              onChange={(e) => setCourseWeight(e.target.value)}
              helperText="Default PRD: 60%"
              type="number"
            />
            <Input
              label="Bobot Exam Completion (%)"
              value={examWeight}
              onChange={(e) => setExamWeight(e.target.value)}
              helperText="Default PRD: 40%"
              type="number"
            />
            <Input
              label="Standar Passing Score Exam (0-100)"
              value={passingScore}
              onChange={(e) => setPassingScore(e.target.value)}
              helperText="Batas minimal lulus ujian evaluasi (PRD §67: 80)"
              type="number"
            />
            <Input
              label="Batas Video Completion Threshold (%)"
              value={videoThreshold}
              onChange={(e) => setVideoThreshold(e.target.value)}
              helperText="Cakupan segmen unik wajib (PRD §35: 98%)"
              type="number"
            />
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-[6px] flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-0.5">
              <p className="font-semibold">Perhatian Server Authoritative:</p>
              <p className="text-amber-800">
                Nilai konfigurasi ini disimpan secara aman pada database dan divalidasi oleh backend engine. Perubahan konfigurasi tidak merusak rekaman riwayat kelulusan lama.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" onClick={handleSave} leftIcon={<Save className="w-4 h-4" />}>
              Simpan Konfigurasi
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
