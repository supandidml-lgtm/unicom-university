"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { observability, generateTraceId } from "@/lib/rum-observability";
import Link from "next/link";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    errorId: "",
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorId: `err-${Date.now()}`,
      errorMessage: error.message || "An unexpected error occurred",
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    observability.recordError({
      errorId: this.state.errorId,
      traceId: generateTraceId(),
      type: "REACT_BOUNDARY",
      message: error.message,
      stack: errorInfo.componentStack || undefined,
      route: typeof window !== "undefined" ? window.location.pathname : "/",
      timestamp: new Date().toISOString(),
      releaseVersion: "v1.1.0",
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorId: "", errorMessage: "" });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] flex items-center justify-center p-6 bg-slate-950 text-slate-100">
          <div className="max-w-md w-full rounded-2xl border border-rose-800/60 bg-slate-900/90 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Terjadi Kendala Tampilan Halaman</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Komponen halaman mengalami kendala rendering. Log kegagalan telah tercatat secara otomatis untuk investigasi tim pengembang.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-slate-400 text-left">
              <p><span className="text-slate-400">Kode Error:</span> {this.state.errorId}</p>
              <p className="text-rose-400 truncate mt-0.5">{this.state.errorMessage}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-500/20"
              >
                <RefreshCw size={14} />
                <span>Muat Ulang Halaman</span>
              </button>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Home size={14} />
                <span>Beranda</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
