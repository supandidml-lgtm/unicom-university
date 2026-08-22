"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchApi } from "@/lib/api-client";
import {
  ShieldCheck,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Certificate } from "@unicom/types";
import Link from "next/link";

export default function PublicVerifyCertificatePage() {
  const params = useParams();
  const token = params?.token as string;

  const [cert, setCert] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!token) return;
      try {
        const res = await fetchApi<Certificate>(`/certificates/verify/${token}`);
        if (res) {
          setCert(res);
        } else {
          setIsError(true);
        }
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Portal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-1">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Portal Verifikasi Sertifikat Publik
          </h1>
          <p className="text-xs text-slate-400">
            UNICOM Service Center · Sistem Otentikasi Sertifikasi Resmi Teknisi
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center space-y-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
            <p className="text-xs text-slate-400">Memvalidasi tanda tangan kriptografi sertifikat...</p>
          </div>
        ) : isError || !cert ? (
          <div className="rounded-2xl border border-rose-800/60 bg-rose-950/30 p-8 text-center space-y-4 shadow-xl">
            <AlertCircle size={48} className="mx-auto text-rose-400" />
            <h2 className="text-lg font-bold text-white">Sertifikat Tidak Valid atau Tidak Ditemukan</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Kode verifikasi <span className="font-mono text-rose-300 font-bold">{token}</span> tidak terdaftar dalam basis data resmi UNICOM University.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              Kembali ke Beranda
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Status Header Badge */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-extrabold tracking-wider uppercase text-emerald-400">
                  SERTIFIKAT ASLI & TERVERIFIKASI
                </span>
              </div>

              <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-[11px] font-mono font-bold text-blue-300">
                {cert.brandName}
              </span>
            </div>

            {/* Certificate Details */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Nomor Registrasi Sertifikat
                  </span>
                  <p className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                    {cert.certificateNumber}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Nama Pemegang
                    </span>
                    <p className="text-sm font-bold text-white mt-0.5">{cert.userName}</p>
                    <p className="text-xs text-blue-400 font-mono">NIK: {cert.userNik}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Program Pelatihan
                    </span>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5">{cert.programTitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Tanggal Kelulusan
                    </span>
                    <p className="text-xs font-medium text-slate-200 mt-0.5">
                      {new Date(cert.issuedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Nilai Ujian & Praktik
                    </span>
                    <p className="text-sm font-black text-emerald-400 mt-0.5">
                      {cert.finalScore} / 100 (PASSED)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Trust Stamp */}
            <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
              <p className="flex items-center justify-center gap-1 font-semibold text-slate-300">
                <CheckCircle size={14} className="text-emerald-400" />
                Diterbitkan secara digital oleh Pusat Pelatihan UNICOM University
              </p>
              <p className="text-[10px]">Tanda tangan digital terenkripsi SHA-256 · Hak Cipta © 2026 UNICOM</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
