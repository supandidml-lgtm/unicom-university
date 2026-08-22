"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  Award,
  Download,
  QrCode,
  Calendar,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { Certificate } from "@unicom/types";
import Link from "next/link";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCerts() {
      try {
        const res = await fetchApi<Certificate[]>("/certificates/user/usr-staff-1");
        if (res) setCertificates(res);
      } catch (err) {
        console.error("Gagal memuat sertifikat:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCerts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wider uppercase">
              <Award size={16} />
              <span>Sertifikasi Resmi UNICOM University</span>
            </div>
            <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Sertifikat Keahlian Digital
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              E-Certificate resmi ber-QR Code dengan verifikasi publik atas kelulusan materi dan ujian teknisi.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <span>Memuat daftar sertifikat digital...</span>
            </div>
          </div>
        ) : certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 lg:p-8 shadow-2xl space-y-6"
              >
                {/* Decorative Seal Background */}
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

                {/* Top Badge */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black shadow-md shadow-amber-500/20">
                      <Award size={22} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400">
                        {cert.brandName} Certified
                      </span>
                      <h3 className="text-xs font-mono font-semibold text-slate-300">
                        {cert.certificateNumber}
                      </h3>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={14} />
                    STATUS: {cert.status}
                  </span>
                </div>

                {/* Main Certificate Body */}
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Diberikan secara resmi kepada:</p>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">{cert.userName}</h2>
                  <p className="text-xs text-blue-400 font-mono">NIK: {cert.userNik}</p>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 mt-3">
                    <p className="text-xs font-semibold text-slate-200">{cert.programTitle}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(cert.issuedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-bold text-white">
                        Nilai Kelulusan: <span className="text-emerald-400">{cert.finalScore} / 100</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions & QR Verification Link */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <Link
                    href={`/verify/${cert.verificationToken}`}
                    target="_blank"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
                  >
                    <QrCode size={16} />
                    <span>Verifikasi QR Publik</span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </Link>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/20 active:scale-95"
                  >
                    <Download size={16} />
                    <span>Cetak PDF Resmi</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-4">
            <Award size={48} className="mx-auto text-slate-600" />
            <h3 className="text-base font-bold text-white">Belum Ada Sertifikat yang Diterbitkan</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Selesaikan 100% materi video & PDF SOP serta lulus ujian evaluasi mingguan dengan nilai minimal 80 untuk mendapatkan sertifikasi resmi brand.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
