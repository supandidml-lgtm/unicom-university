"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, GraduationCap, AlertCircle, ShieldAlert } from "lucide-react";

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) { setError("Password lama wajib diisi."); return; }
    if (newPassword.length < 8) { setError("Password baru minimal 8 karakter."); return; }
    if (!/[A-Z]/.test(newPassword)) { setError("Password baru harus mengandung minimal 1 huruf besar."); return; }
    if (!/[0-9]/.test(newPassword)) { setError("Password baru harus mengandung minimal 1 angka."); return; }
    if (newPassword !== confirmPassword) { setError("Konfirmasi password tidak cocok."); return; }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengubah password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-[6px] bg-blue-600 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm text-slate-900 tracking-tight">UNICOM UNIVERSITY</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-amber-50 border border-amber-300 rounded-[8px] p-4 mb-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">Wajib Ganti Password</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Halo, <strong>{user?.name}</strong>. Demi keamanan akun Anda, password sementara wajib diganti sebelum dapat mengakses sistem.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Buat Password Baru</h1>
              <p className="text-sm text-slate-500 mt-1">
                Password baru harus minimal 8 karakter, mengandung huruf besar dan angka.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-[6px] px-3.5 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-xs text-red-700 font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password Sementara (Lama)</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Password yang diberikan admin"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    disabled={isSubmitting}
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 karakter, huruf besar & angka"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    disabled={isSubmitting}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-[6px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold py-2.5 px-4 rounded-[6px] transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Menyimpan...</span></>
                ) : "Simpan Password Baru"}
              </button>

              <button type="button" onClick={logout} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1.5 transition">
                Keluar dari sistem
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
