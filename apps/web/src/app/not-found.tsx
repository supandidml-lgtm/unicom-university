"use client";

import Link from "next/link";
import { Button } from "@unicom/ui";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center select-none">
      <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xl mb-4">
        404
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-xs md:text-sm text-slate-500 max-w-sm mb-6">
        Halaman yang Anda cari tidak tersedia atau Anda tidak memiliki akses ke alamat tersebut.
      </p>
      <Link href="/">
        <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
          Kembali ke Dashboard
        </Button>
      </Link>
    </div>
  );
}
