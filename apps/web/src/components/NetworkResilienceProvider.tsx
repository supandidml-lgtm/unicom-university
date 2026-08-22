"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { observability, generateTraceId } from "@/lib/rum-observability";

export function NetworkResilienceProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [reconnectedNotice, setReconnectedNotice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setReconnectedNotice(true);
      setTimeout(() => setReconnectedNotice(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      observability.recordError({
        errorId: `err-offline-${Date.now()}`,
        traceId: generateTraceId(),
        type: "API_FAILURE",
        message: "Perangkat kehilangan koneksi internet (Offline)",
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
        releaseVersion: "v1.1.0",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {/* Offline Toast Banner */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-rose-600 px-4 py-2.5 text-white shadow-lg animate-in slide-in-from-top duration-300">
          <div className="mx-auto max-w-7xl flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <WifiOff size={18} className="animate-pulse" />
              <span>Koneksi internet terputus. Data progres lokal tersimpan aman dan akan otomatis disinkronkan saat terhubung kembali.</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1 rounded bg-white/20 px-2.5 py-1 hover:bg-white/30 text-[11px] transition-colors"
            >
              <RefreshCw size={14} />
              <span>Coba Hubungkan</span>
            </button>
          </div>
        </div>
      )}

      {/* Reconnection Success Toast */}
      {reconnectedNotice && (
        <div className="fixed top-0 inset-x-0 z-50 bg-emerald-600 px-4 py-2 text-white shadow-md animate-in slide-in-from-top duration-300">
          <div className="mx-auto max-w-7xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle size={16} />
            <span>Koneksi internet kembali aktif! Sistem siap melanjutkan pembelajaran.</span>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
