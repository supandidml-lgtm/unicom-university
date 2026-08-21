"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Tabs, Card, Badge, Button, ProgressBar, Modal, Input, Select } from "@unicom/ui";
import {
  Calendar,
  User,
  ArrowRight,
  Plus,
} from "lucide-react";

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState("active");
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);
  const [isAssignTraineeOpen, setIsAssignTraineeOpen] = useState(false);

  // Form states
  const [newProgramTitle, setNewProgramTitle] = useState("");
  const [newProgramBrand, setNewProgramBrand] = useState("brand-xiaomi");
  const [newProgramWeeks, setNewProgramWeeks] = useState("4");
  const [newProgramRole, setNewProgramRole] = useState("TECHNICIAN");

  const [assignTraineeNik, setAssignTraineeNik] = useState("");
  const [assignDeadline, setAssignDeadline] = useState("2026-09-15");

  const tabs = [
    { id: "active", label: "Training Aktif", count: 1 },
    { id: "completed", label: "Riwayat Selesai", count: 2 },
    { id: "catalog", label: "Katalog Program Multi-Brand", count: 6 },
  ];

  const brandCatalogs = [
    { brand: "Xiaomi", code: "MI", title: "Xiaomi Certified Technician Track", weeks: 4, profile: "Technician", courses: 5, exams: 3 },
    { brand: "Huawei", code: "HW", title: "Huawei Authorized Service Training", weeks: 4, profile: "Technician", courses: 4, exams: 3 },
    { brand: "Ecovacs", code: "ECO", title: "Ecovacs Robotics Maintenance SOP", weeks: 3, profile: "Technician", courses: 3, exams: 2 },
    { brand: "Tineco", code: "TIN", title: "Tineco Smart Cleaner Diagnostics", weeks: 3, profile: "Technician", courses: 3, exams: 2 },
    { brand: "Laifen", code: "LAF", title: "Laifen High-Speed Motor Repair", weeks: 2, profile: "Technician", courses: 2, exams: 1 },
    { brand: "Yoniev", code: "YON", title: "Yoniev Floor Cleaning System", weeks: 2, profile: "Technician", courses: 2, exams: 1 },
  ];

  return (
    <AppShell pageTitle="Program Training">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Program Training Karyawan
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Kelola kurikulum multi-brand, jadwal assignment pelatihan, dan kelulusan peserta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAssignTraineeOpen(true)}
              leftIcon={<User className="w-4 h-4" />}
            >
              Assign Peserta
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsCreateProgramOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Buat Program Baru
            </Button>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Training Aktif */}
        {activeTab === "active" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4 hover:border-slate-300 transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="default" size="sm">Xiaomi Brand Track</Badge>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    Xiaomi Technician Training
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Program pelatihan hardware, software, sirkuit daya, dan SOP perbaikan resmi perangkat Xiaomi.
                  </p>
                </div>
                <Badge variant="warning" size="sm">In Progress (68%)</Badge>
              </div>

              <div className="p-3 bg-slate-50 rounded-[6px] grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Deadline: 28 Ags 2026</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Trainer: Budi Santoso</span>
                </div>
              </div>

              <div className="space-y-3">
                <ProgressBar value={68} label="Progres Keseluruhan (60% Course + 40% Exam)" variant="primary" />
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                  <div>Course: <span className="font-semibold text-slate-800">75% (9/12 Materi)</span></div>
                  <div>Exam: <span className="font-semibold text-slate-800">55% (Avg Skor 87.5)</span></div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <a href="/courses">
                  <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Lanjutkan Belajar & Ujian
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Riwayat Selesai */}
        {activeTab === "completed" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="success" size="sm">Completed</Badge>
                <span className="text-xs text-slate-400">Mei 2026</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">General SOP & ESD Safety Onboarding</h3>
              <p className="text-xs text-slate-500">Standar keselamatan kerja laboratorium dan penerimaan unit servis.</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Skor Akhir: 94.0</span>
                <Badge variant="success" size="sm">Sertifikat Terbit</Badge>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="success" size="sm">Completed</Badge>
                <span className="text-xs text-slate-400">Juni 2026</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Customer Service Essentials & Warranty SOP</h3>
              <p className="text-xs text-slate-500">Alur administrasi, penerimaan keluhan pelanggan, dan etika komunikasi.</p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Skor Akhir: 91.5</span>
                <Badge variant="success" size="sm">Sertifikat Terbit</Badge>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 3: Katalog Program Multi-Brand */}
        {activeTab === "catalog" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {brandCatalogs.map((item, idx) => (
              <Card key={idx} className="p-5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" size="sm">{item.brand}</Badge>
                    <Badge variant="neutral" size="sm">{item.weeks} Minggu</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">Target Posisi: {item.profile}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-[6px] grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>Modul: {item.courses} Course</div>
                    <div>Evaluasi: {item.exams} Ujian</div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setIsAssignTraineeOpen(true)}>
                    Assign Trainee
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Buat Program Training Baru */}
      <Modal
        isOpen={isCreateProgramOpen}
        onClose={() => setIsCreateProgramOpen(false)}
        title="Buat Program Training Baru"
        description="Scaffold kurikulum pembelajaran terstruktur multi-brand dan multi-minggu."
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="Judul Program Training"
            placeholder="Contoh: Ecovacs Certified Specialist"
            value={newProgramTitle}
            onChange={(e) => setNewProgramTitle(e.target.value)}
          />

          <Select
            label="Brand Partner"
            options={[
              { value: "brand-xiaomi", label: "Xiaomi" },
              { value: "brand-huawei", label: "Huawei" },
              { value: "brand-ecovacs", label: "Ecovacs" },
              { value: "brand-tineco", label: "Tineco" },
              { value: "brand-laifen", label: "Laifen" },
              { value: "brand-yoniev", label: "Yoniev" },
            ]}
            value={newProgramBrand}
            onChange={(e) => setNewProgramBrand(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Target Job Profile"
              options={[
                { value: "TECHNICIAN", label: "Technician" },
                { value: "CUSTOMER_SERVICE", label: "Customer Service" },
                { value: "ADMIN", label: "Administrator" },
              ]}
              value={newProgramRole}
              onChange={(e) => setNewProgramRole(e.target.value)}
            />

            <Select
              label="Durasi Minggu (Weeks)"
              options={[
                { value: "2", label: "2 Minggu" },
                { value: "3", label: "3 Minggu" },
                { value: "4", label: "4 Minggu" },
                { value: "6", label: "6 Minggu" },
              ]}
              value={newProgramWeeks}
              onChange={(e) => setNewProgramWeeks(e.target.value)}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-[6px] text-xs text-blue-900">
            Program akan otomatis menggunakan bobot server resmi: <strong>60% Course + 40% Exam</strong> dengan passing score <strong>80</strong>.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateProgramOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                alert("Program training berhasil dibuat dan di-scaffold di server.");
                setIsCreateProgramOpen(false);
              }}
            >
              Simpan & Buat Kurikulum
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Assign Trainee */}
      <Modal
        isOpen={isAssignTraineeOpen}
        onClose={() => setIsAssignTraineeOpen(false)}
        title="Assign Peserta ke Program Training"
        description="Pilih karyawan dan tetapkan batas waktu (deadline) penyelesaian."
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="NIK Karyawan"
            placeholder="Contoh: UC10042 (Andi Pratama)"
            value={assignTraineeNik}
            onChange={(e) => setAssignTraineeNik(e.target.value)}
          />

          <Select
            label="Pilih Program Training"
            options={[
              { value: "prog-xiaomi-tech", label: "Xiaomi Certified Technician Training (4 Minggu)" },
              { value: "prog-huawei-tech", label: "Huawei Authorized Service Training (4 Minggu)" },
              { value: "prog-ecovacs-tech", label: "Ecovacs Robotics Maintenance SOP (3 Minggu)" },
            ]}
          />

          <Input
            label="Batas Waktu Penyelesaian (Deadline)"
            type="date"
            value={assignDeadline}
            onChange={(e) => setAssignDeadline(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAssignTraineeOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                alert("Assignment training berhasil diberikan kepada peserta.");
                setIsAssignTraineeOpen(false);
              }}
            >
              Tetapkan Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
