"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  Award,
  Video,
  FileText,
  Building2,
  Sparkles,
  ArrowRight,
  Clock,
  X,
  Command,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchItem {
  id: string;
  title: string;
  category: "BRAND" | "PROGRAM" | "SOP" | "VIDEO" | "AI_ASSISTANT";
  subtitle: string;
  href: string;
  brand?: string;
  keywords: string[];
}

const SEARCH_INDEX: SearchItem[] = [
  {
    id: "brand-mi",
    title: "Xiaomi Ecosystem & Smartphone Repair",
    category: "BRAND",
    subtitle: "Brand Partner Resmi · Servis Handphone & IoT Xiaomi",
    href: "/competency",
    brand: "Xiaomi",
    keywords: ["xiaomi", "redmi", "poco", "mi", "handphone", "smartphone", "pmic", "fingerprint"],
  },
  {
    id: "brand-hw",
    title: "Huawei Device & Tablet Solutions",
    category: "BRAND",
    subtitle: "Brand Partner Resmi · Servis Tablet & Perangkat Huawei",
    href: "/competency",
    brand: "Huawei",
    keywords: ["huawei", "matepad", "harmonyos", "battery", "display", "tablet"],
  },
  {
    id: "brand-ec",
    title: "Ecovacs Smart Robotics & Vacuum",
    category: "BRAND",
    subtitle: "Brand Partner Resmi · Deebot Robotic Vacuum & Mopping",
    href: "/competency",
    brand: "Ecovacs",
    keywords: ["ecovacs", "deebot", "vacuum", "robot", "truemapping", "dstop", "lidar"],
  },
  {
    id: "prog-xiaomi-1",
    title: "Teknisi Handphone Xiaomi Level 1",
    category: "PROGRAM",
    subtitle: "Kurikulum 4 Minggu · Dasar Servis & SOP Garansi",
    href: "/courses",
    brand: "Xiaomi",
    keywords: ["kurikulum", "program", "xiaomi", "level 1", "dasar", "esd", "bongkar"],
  },
  {
    id: "sop-garansi-mi",
    title: "SOP & Kebijakan Garansi Resmi Xiaomi",
    category: "SOP",
    subtitle: "Dokumen SOP Resmi · Aturan Klaim Garansi & Void Kerusakan Cairan",
    href: "/courses",
    brand: "Xiaomi",
    keywords: ["sop", "garansi", "warranty", "kebijakan", "void", "liquid", "water damage", "xiaomi"],
  },
  {
    id: "sop-kalibrasi-fp",
    title: "Prosedur Kalibrasi Optical Fingerprint Xiaomi",
    category: "SOP",
    subtitle: "Dokumen Teknis · Kalibrasi Sensor Sidik Jari Pasca Ganti Layar AMOLED",
    href: "/courses",
    brand: "Xiaomi",
    keywords: ["kalibrasi", "optical", "fingerprint", "sensor", "amoled", "lcd", "layar"],
  },
  {
    id: "video-pmic-diag",
    title: "Video Tutorial: Diagnosa Jalur VPH_PWR & Sirkuit PMIC",
    category: "VIDEO",
    subtitle: "Video Praktik Servis · Pengukuran Tegangan & Isolasi Short Circuit",
    href: "/courses",
    brand: "Xiaomi",
    keywords: ["video", "pmic", "power", "vph_pwr", "multimeter", "short", "daya", "mati total"],
  },
  {
    id: "ai-sop-assist",
    title: "Tanya Asisten AI SOP Unicom",
    category: "AI_ASSISTANT",
    subtitle: "Pencarian Cerdas Dokumen SOP Resmi dengan Sitasi Nomor Halaman",
    href: "/competency",
    keywords: ["tanya", "ai", "asisten", "sop", "bantuan", "troubleshooting", "chat"],
  },
  {
    id: "menu-matrix",
    title: "Profil Matriks Kompetensi Teknisi",
    category: "PROGRAM",
    subtitle: "Evaluasi Radar Keahlian per Brand & Kategori Kemahiran",
    href: "/competency",
    keywords: ["matriks", "kompetensi", "skill", "matrix", "radar", "nilai", "level"],
  },
  {
    id: "menu-cert",
    title: "E-Sertifikat Digital & Verifikasi QR",
    category: "PROGRAM",
    subtitle: "Koleksi Sertifikat Resmi Kelulusan & Unduh PDF",
    href: "/certificates",
    keywords: ["sertifikat", "certificate", "qr", "verifikasi", "unduh", "pdf", "kelulusan"],
  },
  {
    id: "menu-analytics",
    title: "Dashboard Analitik Eksekutif Multi-Cabang",
    category: "PROGRAM",
    subtitle: "Komparasi Kinerja Service Center & Kelulusan Lintas Cabang",
    href: "/analytics",
    keywords: ["analitik", "analytics", "cabang", "branch", "laporan", "kpi", "komparasi"],
  },
  {
    id: "menu-trainer",
    title: "Form Evaluasi Keterampilan Praktik Meja Kerja",
    category: "PROGRAM",
    subtitle: "Rubrik Penilaian 4-Indikator (ESD, Pembongkaran, Diagnosa, Laporan)",
    href: "/trainer/evaluation",
    keywords: ["evaluasi", "praktik", "trainer", "rubrik", "meja kerja", "esd", "skor"],
  },
];

export function GlobalOmnisearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  // Load Recent Searches
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("unicom_recent_searches") || "[]");
      setRecentSearches(stored);
    } catch {}
  }, []);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter & Rank Results
  const filteredResults = useMemo(() => {
    if (!query.trim()) {
      return SEARCH_INDEX.slice(0, 6);
    }
    const q = query.toLowerCase().trim();
    return SEARCH_INDEX.filter((item) => {
      const matchCat = activeCategory === "ALL" || item.category === activeCategory;
      const matchText =
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q));
      return matchCat && matchText;
    });
  }, [query, activeCategory]);

  const handleSelect = (item: SearchItem) => {
    // Save to Recent Searches
    try {
      const updated = [item.title, ...recentSearches.filter((s) => s !== item.title)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("unicom_recent_searches", JSON.stringify(updated));
    } catch {}

    setIsOpen(false);
    router.push(item.href);
  };

  const getCategoryIcon = (category: SearchItem["category"]) => {
    switch (category) {
      case "BRAND":
        return <Building2 size={16} className="text-amber-400" />;
      case "PROGRAM":
        return <Award size={16} className="text-blue-400" />;
      case "SOP":
        return <FileText size={16} className="text-emerald-400" />;
      case "VIDEO":
        return <Video size={16} className="text-purple-400" />;
      case "AI_ASSISTANT":
        return <Sparkles size={16} className="text-cyan-400" />;
    }
  };

  return (
    <>
      {/* Search Header Trigger Bar */}
      <button
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:bg-slate-800/80 hover:text-slate-200 transition-all shadow-xs"
      >
        <Search size={14} className="group-hover:text-blue-400 transition-colors" />
        <span className="hidden sm:inline font-medium">Cari materi, SOP, brand, atau video...</span>
        <span className="inline sm:hidden font-medium">Cari...</span>
        <kbd className="ml-2 hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
          <Command size={10} /> K
        </kbd>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 sm:pt-20 animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center border-b border-slate-800 bg-slate-950 px-4 py-3.5">
              <Search size={18} className="text-blue-400 mr-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Ketik kata kunci (misal: SOP Xiaomi, PMIC, Deebot, Kalibrasi)..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 text-slate-400 hover:text-white mr-2"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-400 hover:text-white"
              >
                ESC
              </button>
            </div>

            {/* Category Filter Bar */}
            <div className="flex items-center gap-1.5 border-b border-slate-800/80 bg-slate-900/60 px-4 py-2 text-[11px] overflow-x-auto">
              {["ALL", "BRAND", "PROGRAM", "SOP", "VIDEO"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1 font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  {cat === "ALL" ? "Semua Kategori" : cat}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {filteredResults.length > 0 ? (
                filteredResults.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`group flex items-center justify-between rounded-xl p-3 cursor-pointer transition-all ${
                      selectedIndex === idx
                        ? "bg-blue-600/20 border border-blue-500/30"
                        : "hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 shadow-xs">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                            {item.title}
                          </span>
                          {item.brand && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-semibold text-slate-300">
                              {item.brand}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>

                    <ArrowRight size={14} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))
              ) : (
                <div className="py-12 text-center space-y-2">
                  <Search size={32} className="mx-auto text-slate-600" />
                  <p className="text-xs font-semibold text-slate-300">Tidak ada hasil yang cocok dengan "{query}"</p>
                  <p className="text-[11px] text-slate-400">Coba gunakan kata kunci umum seperti SOP, Garansi, atau nama Brand.</p>
                </div>
              )}
            </div>

            {/* Footer Information */}
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 py-2.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-400">Tips:</span>
                <span>Gunakan panah ↑ ↓ dan Enter untuk navigasi instan</span>
              </div>
              <span className="text-[10px]">Unicom Omnisearch V1.1</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
