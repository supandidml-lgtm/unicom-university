"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const PUBLIC_ROUTES = ["/login", "/change-password"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

    if (!isAuthenticated && !isPublic) {
      // PRD §82: Backend authorization — also gate frontend routes
      router.replace("/login");
      return;
    }

    if (isAuthenticated && user?.mustChangePassword && pathname !== "/change-password") {
      // PRD §15: Force password change before accessing system
      router.replace("/change-password");
      return;
    }

    if (isAuthenticated && isPublic && pathname === "/login") {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
