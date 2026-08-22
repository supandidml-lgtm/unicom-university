"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, GraduationCap, AlertCircle, CheckCircle2 } from "lucide-react";

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

  useEffect(() => {
    if (searchParams.get("passwordChanged") === "true") {
      setSuccessMsg("Password berhasil diubah. Silakan login kembali.");
    }
    if (searchParams.get("sessionExpired") === "true") {
      setError("Sesi Anda telah berakhir. Silakan login kembali.");
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
      setError("NIK atau Email wajib diisi.");
      return;
    }
    if (!password) {
      setError("Password wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login gagal. Coba lagi.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-[6px] bg-blue-600 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm text-slate-900 tracking-tight">UNICOM UNIVERSITY</span>
        <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Internal LMS</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Masuk ke Akun Anda</h1>
              <p className="text-sm text-slate-500 mt-1">
                Gunakan NIK atau Email resmi perusahaan untuk login.
              </p>
            </div>

            {/* Success Message */}
            {successMsg && (
              <div className="mb-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-[6px] px-3.5 py-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span className="text-xs text-emerald-800 font-medium">{successMsg}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-[6px] px-3.5 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-xs text-red-700 font-medium">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="identifier">
                  NIK / Email Karyawan
                </label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: UC10042 atau andi@unicom.co.id"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-[6px] bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  autoComplete="username"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-[6px] bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold py-2.5 px-4 rounded-[6px] transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  "Masuk ke Unicom University"
                )}
              </button>
            </form>
          </div>

          {/* Demo credentials hint with 1-click fill */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-[8px] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-blue-800">Akun Siap Pakai (Klik untuk Isi Otomatis)</p>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-100 px-1.5 py-0.5 rounded">1-Click Fill</span>
            </div>
            <div className="space-y-1.5 text-xs text-blue-700">
              <button
                type="button"
                onClick={() => {
                  setIdentifier("admin@unicom.co.id");
                  setPassword("UnicomPassword2026!");
                  setError(null);
                }}
                className="w-full flex justify-between items-center p-1.5 rounded hover:bg-blue-100/70 transition text-left"
              >
                <span className="font-medium text-slate-800">👑 Super Admin</span>
                <span className="font-mono text-[11px] text-blue-800">admin@unicom.co.id</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIdentifier("trainer@unicom.co.id");
                  setPassword("UnicomPassword2026!");
                  setError(null);
                }}
                className="w-full flex justify-between items-center p-1.5 rounded hover:bg-blue-100/70 transition text-left"
              >
                <span className="font-medium text-slate-800">🎓 Trainer</span>
                <span className="font-mono text-[11px] text-blue-800">trainer@unicom.co.id</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIdentifier("supervisor.jkt@unicom.co.id");
                  setPassword("UnicomPassword2026!");
                  setError(null);
                }}
                className="w-full flex justify-between items-center p-1.5 rounded hover:bg-blue-100/70 transition text-left"
              >
                <span className="font-medium text-slate-800">👔 Supervisor</span>
                <span className="font-mono text-[11px] text-blue-800">supervisor.jkt@unicom.co.id</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIdentifier("andi.pratama@unicom.co.id");
                  setPassword("UnicomPassword2026!");
                  setError(null);
                }}
                className="w-full flex justify-between items-center p-1.5 rounded hover:bg-blue-100/70 transition text-left"
              >
                <span className="font-medium text-slate-800">🔧 Staff / Teknisi</span>
                <span className="font-mono text-[11px] text-blue-800">andi.pratama@unicom.co.id</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Password default: <code className="font-bold text-slate-700 bg-white px-1 py-0.5 rounded border border-slate-200">UnicomPassword2026!</code>
            </p>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Unicom University © 2026 · Platform Pelatihan Internal
          </p>
        </div>
      </div>
    </div>
  );
}
