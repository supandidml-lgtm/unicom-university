"use client";

import React, { useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  Sparkles,
  Send,
  BookOpen,
  X,
  Lightbulb,
} from "lucide-react";
import { KnowledgeQueryResponse } from "@unicom/types";

export function AiKnowledgeAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      role: "user" | "assistant";
      text: string;
      citations?: KnowledgeQueryResponse["citations"];
      hasSufficientSources?: boolean;
      suggestedFollowUps?: string[];
      timestamp: string;
    }>
  >([
    {
      role: "assistant",
      text: "Halo! Saya **Asisten AI Unicom University**. Tanyakan prosedur servis, diagnosa troubleshooting, atau kebijakan SOP garansi resmi. Jawaban saya selalu disertai rujukan dokumen dan nomor halaman resmi.",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      suggestedFollowUps: [
        "Berapa lama masa garansi resmi smartphone Xiaomi?",
        "Bagaimana cara kalibrasi optical fingerprint Xiaomi?",
        "Apa langkah troubleshooting navigasi Ecovacs Deebot?",
        "Bagaimana standar keselamatan penanganan baterai Huawei?",
      ],
    },
  ]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || query;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = {
      role: "user" as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setHistory((prev) => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);

    try {
      const res = await fetchApi<KnowledgeQueryResponse>("/assistant/query", {
        method: "POST",
        body: JSON.stringify({
          query: textToSend,
          brandId: selectedBrand,
        }),
      });

      if (res) {
        setHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            text: res.answer,
            citations: res.citations,
            hasSufficientSources: res.hasSufficientSources,
            suggestedFollowUps: res.suggestedFollowUps,
            timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Terjadi kesalahan saat memproses pertanyaan Anda. Pastikan koneksi server aktif dan coba beberapa saat lagi.",
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-105 hover:shadow-blue-500/40 active:scale-95"
      >
        <Sparkles size={20} className="animate-pulse text-amber-300 fill-amber-300" />
        <span>Tanya AI SOP</span>
      </button>

      {/* Slide-over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="flex h-[620px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md">
                  <Sparkles size={18} className="text-white fill-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Asisten AI Unicom University
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                      SOP Grounded
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Rujukan Terverifikasi Dokumen Resmi Servis</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Brand Filter Pill Bar */}
            <div className="flex items-center gap-1.5 border-b border-slate-800/80 bg-slate-900/90 px-4 py-2 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-medium whitespace-nowrap">Brand:</span>
              {[
                { id: "ALL", name: "Semua Brand" },
                { id: "brand-xiaomi", name: "Xiaomi" },
                { id: "brand-huawei", name: "Huawei" },
                { id: "brand-ecovacs", name: "Ecovacs" },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrand(b.id)}
                  className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${
                    selectedBrand === b.id
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            {/* Messages Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {history.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-xs"
                        : "bg-slate-800/90 text-slate-200 border border-slate-700/50 rounded-tl-xs shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {/* Citations Box */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/60 space-y-1.5">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                          <BookOpen size={14} />
                          <span>Sumber Resmi Terverifikasi:</span>
                        </div>
                        {msg.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="rounded-lg bg-slate-900/80 p-2 border border-slate-700/40 text-[10px] text-slate-300"
                          >
                            <div className="font-semibold text-blue-400 flex items-center justify-between">
                              <span>📄 {c.documentName}</span>
                              {c.pageNumber && (
                                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-300">
                                  Hal. {c.pageNumber}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-slate-400 italic">"{c.snippet}"</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggested Followups */}
                    {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-700/40">
                        <p className="text-[10px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                          <Lightbulb size={12} className="text-amber-400 fill-amber-400" />
                          Contoh Pertanyaan Populer:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedFollowUps.map((fu, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => handleSend(fu)}
                              className="rounded-lg bg-slate-900/90 hover:bg-slate-700/90 border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:text-white transition-all text-left"
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="mt-1 text-[9px] text-slate-400 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 animate-spin">
                    <Sparkles size={14} />
                  </div>
                  <span>Mencari dokumen SOP dan memvalidasi sumber...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="border-t border-slate-800 bg-slate-950 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tanyakan SOP garansi, kalibrasi sensor, atau perbaikan..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 shadow-md shadow-blue-500/20"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
