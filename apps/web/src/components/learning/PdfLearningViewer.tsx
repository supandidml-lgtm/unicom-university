"use client";

import React, { useState, useEffect } from "react";
import { Button, Badge } from "@unicom/ui";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react";

export interface PdfLearningViewerProps {
  materialId?: string;
  assignmentId?: string;
  title: string;
  totalPages?: number;
  onCompleted?: () => void;
}

export const PdfLearningViewer: React.FC<PdfLearningViewerProps> = ({
  title,
  totalPages = 5,
  onCompleted,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [visitedPages, setVisitedPages] = useState<number[]>([1]);
  const [pageReadingSeconds, setPageReadingSeconds] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Page reading dwell timer
  useEffect(() => {
    const timer = setInterval(() => {
      setPageReadingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    setPageReadingSeconds(0);

    if (!visitedPages.includes(newPage)) {
      const nextVisited = [...visitedPages, newPage].sort((a, b) => a - b);
      setVisitedPages(nextVisited);

      if (nextVisited.length >= totalPages && !isCompleted) {
        setIsCompleted(true);
        if (onCompleted) onCompleted();
      }
    }
  };

  const coveragePercent = Math.round((visitedPages.length / totalPages) * 100);

  const samplePageContents = [
    {
      page: 1,
      heading: "Bab 1: Kebijakan Garansi Resmi Multi-Brand",
      body: "Dokumen ini menetapkan standar operasional penerimaan unit servis untuk seluruh brand rekanan (Xiaomi, Huawei, Ecovacs, Tineco, Laifen, Yoniev). Teknisi wajib memeriksa kecocokan nomor seri / IMEI, fisik unit, dan tanggal pembelian pada invoice.",
    },
    {
      page: 2,
      heading: "Bab 2: Batasan Void Garansi & Kerusakan Cairan",
      body: "Garansi resmi otomatis gugur apabila Liquid Damage Indicator (LDI) berubah warna merah pekat, terdapat korosi pada pin konektor baterai, atau ditemukan bekas pembongkaran pihak ketiga tanpa izin resmi.",
    },
    {
      page: 3,
      heading: "Bab 3: Prosedur Penggantian Unit DOA (Dead on Arrival)",
      body: "Unit yang mengalami kegagalan fungsi manufaktur dalam kurun waktu 7 hari sejak tanggal pembelian wajib ditangani melalui alur penggantian unit baru (DOA Replacement) setelah diverifikasi oleh Lead Technician.",
    },
    {
      page: 4,
      heading: "Bab 4: Penanganan Komponen Sensitif ESD & Laboratorium",
      body: "Semua modul motherboard, IC Power, dan panel AMOLED harus ditangani di area Anti-Static Discharge. Teknisi dilarang menyentuh pin kontak tanpa memakai sarung tangan ESD dan wrist strap terhubung ke ground.",
    },
    {
      page: 5,
      heading: "Bab 5: Checklist QC Akhir & Serah Terima Unit",
      body: "Sebelum unit dikembalikan kepada pelanggan, lakukan pengujian 24 titik fungsi (layar sentuh, kamera utama/depan, sensor proximity, charging rate, speaker, earpiece, mikrofon ganda, dan sinyal seluler/Wi-Fi).",
    },
  ];

  const currentContent = samplePageContents[currentPage - 1] || samplePageContents[0]!;

  return (
    <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden flex flex-col">
      {/* Header Info */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
            PDF
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <p className="text-xs text-slate-500">Materi Bacaan Wajib • Standar 100% Page Coverage</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-[4px]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Waktu Halaman: {pageReadingSeconds} detik</span>
          </div>

          <Badge variant={isCompleted ? "success" : "warning"} size="sm">
            {visitedPages.length} / {totalPages} Halaman ({coveragePercent}%)
          </Badge>
        </div>
      </div>

      {/* Document Viewport */}
      <div className="p-8 min-h-[320px] bg-slate-50/40 flex flex-col justify-between">
        <div className="max-w-2xl mx-auto space-y-4 bg-white p-8 rounded-[8px] border border-slate-200 shadow-sm w-full">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
              Halaman {currentPage} dari {totalPages}
            </span>
            {visitedPages.includes(currentPage) && (
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Terbaca
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-slate-900">{currentContent.heading}</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{currentContent.body}</p>
        </div>

        {/* Page Coverage Track */}
        <div className="max-w-2xl mx-auto w-full pt-6">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Cakupan Membaca Dokumen (100% Required)</span>
            <span className="font-semibold text-slate-800">{coveragePercent}%</span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                onClick={() => handlePageChange(pNum)}
                className={`flex-1 h-2 rounded-full transition-all ${
                  visitedPages.includes(pNum)
                    ? "bg-emerald-500"
                    : pNum === currentPage
                    ? "bg-blue-400"
                    : "bg-slate-200"
                }`}
                title={`Halaman ${pNum}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Halaman Sebelumnya
        </Button>

        <span className="text-xs font-semibold text-slate-700">
          Hal. {currentPage} / {totalPages}
        </span>

        <Button
          size="sm"
          variant={currentPage === totalPages && isCompleted ? "outline" : "primary"}
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Halaman Selanjutnya
        </Button>
      </div>
    </div>
  );
};
