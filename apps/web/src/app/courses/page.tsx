"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Badge, Input, Select, Button, Modal } from "@unicom/ui";
import { VideoLearningPlayer } from "@/components/learning/VideoLearningPlayer";
import { PdfLearningViewer } from "@/components/learning/PdfLearningViewer";
import { ExamTakingModal } from "@/components/exam/ExamTakingModal";
import {
  Search,
  Video,
  FileText,
  Lock,
  Award,
} from "lucide-react";

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("all");

  // Learning modal states
  const [activeMedia, setActiveMedia] = useState<{
    id: string;
    type: "VIDEO" | "PDF";
    title: string;
  } | null>(null);

  // Exam modal states
  const [activeExam, setActiveExam] = useState<{
    id: string;
    title: string;
    weekNumber: number;
  } | null>(null);

  const sampleCourses = [
    {
      id: "c-1",
      week: 1,
      title: "Pengenalan Ekosistem & Garansi Resmi",
      description: "Standar operasional penerimaan unit, pengecekan IMEI, dan validasi garansi vendor.",
      duration: "45 Menit",
      materials: [
        { id: "mat-v-101", title: "Video SOP Penerimaan Unit & Cek Fisik", type: "VIDEO" as const },
        { id: "mat-p-101", title: "Buku Pedoman Garansi Resmi Xiaomi 2026", type: "PDF" as const },
      ],
      exam: { id: "exam-mi-week-1", title: "Ujian Evaluasi Week 1 — SOP & ESD Safety" },
      status: "COMPLETED",
    },
    {
      id: "c-2",
      week: 2,
      title: "Teknik Pembongkaran & Keselamatan ESD",
      description: "Pencegahan electrostatic discharge, peralatan wajib lab servis, dan safety rules.",
      duration: "60 Menit",
      materials: [
        { id: "mat-v-201", title: "Video Prosedur Teardown & Rekat Ulang Backcover", type: "VIDEO" as const },
        { id: "mat-p-201", title: "Checklist Kelayakan Alat Laboratorium ESD", type: "PDF" as const },
      ],
      exam: { id: "exam-mi-week-2", title: "Ujian Evaluasi Week 2 — Hardware Teardown" },
      status: "COMPLETED",
    },
    {
      id: "c-3",
      week: 3,
      title: "Troubleshooting Power IC & Charging Circuit",
      description: "Analisis skema sirkuit daya, pengukuran arus konsumsi dengan power supply digital.",
      duration: "90 Menit",
      materials: [
        { id: "mat-v-301", title: "Video Pengukuran IC Power & VBUS", type: "VIDEO" as const },
        { id: "mat-p-301", title: "Skematik Jalur Daya & IC Power Xiaomi", type: "PDF" as const },
      ],
      exam: { id: "exam-mi-week-3", title: "Ujian Evaluasi Week 3 — Sirkuit Daya & AMOLED" },
      status: "IN_PROGRESS",
    },
    {
      id: "c-4",
      week: 4,
      title: "Kalibrasi Sensor & Final Quality Check",
      description: "Prosedur pengetesan 24 titik fungsi sebelum unit diserahkan kembali kepada customer.",
      duration: "60 Menit",
      materials: [
        { id: "mat-v-401", title: "Video Prosedur 24-Point QC Checklist", type: "VIDEO" as const },
        { id: "mat-p-401", title: "Standar Form QC Cetak & Final Handover", type: "PDF" as const },
      ],
      exam: { id: "exam-mi-week-4", title: "Comprehensive Final Assessment Exam" },
      status: "LOCKED",
    },
  ];

  const filteredCourses = sampleCourses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesWeek = selectedWeek === "all" || `w${c.week}` === selectedWeek;
    return matchesSearch && matchesWeek;
  });

  return (
    <AppShell pageTitle="Katalog Course">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Katalog Course & Materi Pembelajaran
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Daftar modul, video tutorial, dokumen PDF, dan evaluasi ujian berbobot resmi (Course 60% / Exam 40%).
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-[8px] p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Cari judul course atau topik..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <Select
              options={[
                { value: "all", label: "Semua Minggu (Week)" },
                { value: "w1", label: "Week 1 — SOP & Garansi" },
                { value: "w2", label: "Week 2 — Teardown & ESD" },
                { value: "w3", label: "Week 3 — Sirkuit Daya" },
                { value: "w4", label: "Week 4 — Final QC" },
              ]}
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-56"
            />
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="p-5 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="neutral" size="sm">Minggu {course.week}</Badge>
                  {course.status === "COMPLETED" && <Badge variant="success" size="sm">Selesai (100%)</Badge>}
                  {course.status === "IN_PROGRESS" && <Badge variant="warning" size="sm">Sedang Berjalan</Badge>}
                  {course.status === "LOCKED" && <Badge variant="neutral" size="sm">Terkunci (Sequential)</Badge>}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {course.description}
                  </p>
                </div>

                {/* Materials List */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    Materi Pembelajaran ({course.materials.length}):
                  </span>
                  <div className="space-y-1.5">
                    {course.materials.map((mat) => (
                      <div
                        key={mat.id}
                        onClick={() => {
                          if (course.status !== "LOCKED") {
                            setActiveMedia({ id: mat.id, type: mat.type, title: mat.title });
                          }
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-[6px] border text-xs transition-colors ${
                          course.status === "LOCKED"
                            ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-slate-50/70 border-slate-200 text-slate-800 hover:bg-blue-50/70 hover:border-blue-200 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {mat.type === "VIDEO" ? (
                            <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate font-medium">{mat.title}</span>
                        </div>
                        <span className="text-[11px] text-blue-600 font-semibold shrink-0 ml-2">
                          {course.status !== "LOCKED" && "Buka Materi →"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grounded Exam Option */}
                {course.exam && (
                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-[6px] flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-purple-950">
                        <Award className="w-3.5 h-3.5 text-purple-700" />
                        <span>Evaluasi Ujian Week {course.week}</span>
                      </div>
                      <p className="text-[11px] text-purple-700">Bobot: 40% • Passing Score: 80</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={course.status === "LOCKED"}
                      onClick={() => setActiveExam({ id: course.exam.id, title: course.exam.title, weekNumber: course.week })}
                      className="bg-white"
                    >
                      Mulai Ujian
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Estimasi Waktu: {course.duration}</span>
                {course.status === "LOCKED" && (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Selesaikan Week Sebelumnya
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Interactive Media Learning Modal (Video & PDF) */}
      {activeMedia && (
        <Modal
          isOpen={true}
          onClose={() => setActiveMedia(null)}
          title={activeMedia.type === "VIDEO" ? "Interactive Video Player (Anti-Skip)" : "Interactive PDF Document Reader"}
          maxWidth="xl"
        >
          {activeMedia.type === "VIDEO" ? (
            <VideoLearningPlayer
              materialId={activeMedia.id}
              assignmentId="asg-andi-1"
              title={activeMedia.title}
              onCompleted={() => {}}
            />
          ) : (
            <PdfLearningViewer
              materialId={activeMedia.id}
              assignmentId="asg-andi-1"
              title={activeMedia.title}
              onCompleted={() => {}}
            />
          )}
        </Modal>
      )}

      {/* Interactive Exam Modal */}
      {activeExam && (
        <ExamTakingModal
          isOpen={true}
          onClose={() => setActiveExam(null)}
          examTitle={activeExam.title}
          passingScore={80}
        />
      )}
    </AppShell>
  );
}
