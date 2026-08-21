"use client";

import React, { useEffect } from "react";
import { Button } from "@unicom/ui";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center select-none">
      <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">
        Terjadi Kesalahan Aplikasi
      </h1>
      <p className="text-xs md:text-sm text-slate-500 max-w-sm mb-6">
        {error?.message || "Sistem mengalami kendala saat memproses halaman ini."}
      </p>
      <Button
        variant="primary"
        onClick={() => reset()}
        leftIcon={<RotateCcw className="w-4 h-4" />}
      >
        Muat Ulang
      </Button>
    </div>
  );
}
