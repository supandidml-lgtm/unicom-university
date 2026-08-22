"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Eye,
  EyeOff,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof window !== "undefined" && "caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      setIdentifier("");
      setPassword("");
      setError(null);
      setSuccessMsg("Semua cache browser & data sesi berhasil dibersihkan.");
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch {
      window.location.reload();
    }
  };

  useEffect(() => {
    if (searchParams.get("passwordChanged") === "true") {
      setSuccessMsg("Password berhasil diubah. Silakan login kembali dengan password baru Anda.");
    }
    if (searchParams.get("sessionExpired") === "true") {
      setError("Sesi Anda telah berakhir demi keamanan. Silakan login kembali.");
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!identifier.trim()) {
      setError("Nomor Induk Karyawan (NIK) atau Email resmi wajib diisi.");
      return;
    }
    if (!password) {
      setError("Kata sandi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login gagal. Periksa kembali NIK/Email dan password Anda.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none">
      {/* Top Enterprise Brand Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-blue-600 flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 tracking-tight block">UNICOM UNIVERSITY</span>
            <span className="text-[10px] text-slate-500 block leading-tight">Enterprise Learning Management System</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem Resmi & Terproteksi</span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Masuk ke Portal LMS</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                Gunakan NIK atau Email resmi perusahaan Anda untuk mengakses materi pelatihan dan ujian sertifikasi.
              </p>
            </div>

            {/* Success Feedback Alert */}
            {successMsg && (
              <div className="mb-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-[6px] px-3.5 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span className="text-xs text-emerald-800 font-medium leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* Error Feedback Alert */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-[6px] px-3.5 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-xs text-red-700 font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="identifier">
                  NIK atau Email Pegawai <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: UC10042 atau andi@unicom.co.id"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-[6px] bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    autoComplete="username"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
                    Kata Sandi <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi Anda"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-[6px] bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold py-2.5 px-4 rounded-[6px] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Akun Anda</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo & Quick Fill Container */}
            <div className="mt-6 pt-5 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Akun Demo (Klik untuk Isi Cepat)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">UnicomPassword2026!</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("admin@unicom.co.id");
                    setPassword("UnicomPassword2026!");
                    setError(null);
                  }}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-[6px] text-left hover:bg-blue-50 hover:border-blue-300 transition"
                >
                  <span className="text-xs font-bold text-slate-800 block">👑 Super Admin</span>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">admin@unicom.co.id</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("trainer@unicom.co.id");
                    setPassword("UnicomPassword2026!");
                    setError(null);
                  }}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-[6px] text-left hover:bg-amber-50 hover:border-amber-300 transition"
                >
                  <span className="text-xs font-bold text-slate-800 block">🎓 Trainer</span>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">trainer@unicom.co.id</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("supervisor.jkt@unicom.co.id");
                    setPassword("UnicomPassword2026!");
                    setError(null);
                  }}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-[6px] text-left hover:bg-indigo-50 hover:border-indigo-300 transition"
                >
                  <span className="text-xs font-bold text-slate-800 block">👔 Supervisor</span>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">supervisor.jkt@unicom.co.id</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier("andi.pratama@unicom.co.id");
                    setPassword("UnicomPassword2026!");
                    setError(null);
                  }}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-[6px] text-left hover:bg-emerald-50 hover:border-emerald-300 transition"
                >
                  <span className="text-xs font-bold text-slate-800 block">🔧 Staff / Teknisi</span>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">andi.pratama@unicom.co.id</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clear Cache & Clean Reset Link */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleClearCache}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-slate-200/70 transition"
              title="Bersihkan seluruh riwayat cache & session"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Bersihkan Cache & Reset Browser</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200 bg-white">
        <p>Unicom University © 2026 · Official Internal Training & Technician Certification Platform</p>
      </footer>
    </div>
  );
}
