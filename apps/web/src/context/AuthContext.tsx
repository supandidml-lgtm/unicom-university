"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SystemRole, JobProfile, AccountStatus } from "@unicom/types";
import { getBaseApiUrl } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  nik: string;
  name: string;
  email: string;
  role: SystemRole;
  jobProfile: JobProfile;
  branchId: string;
  branchName: string;
  brandIds: string[];
  status: AccountStatus;
  mustChangePassword?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "unicom_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const { user: storedUser, token } = JSON.parse(stored);
        setUser(storedUser);
        setAccessToken(token);
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const apiUrl = getBaseApiUrl();
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "Login gagal. Periksa kembali NIK/Email dan password Anda.");
    }

    const { accessToken: token, user: userData } = json.data;
    const authUser: AuthUser = {
      id: userData.id,
      nik: userData.nik,
      name: userData.name,
      email: userData.email,
      role: userData.role as SystemRole,
      jobProfile: userData.jobProfile as JobProfile,
      branchId: userData.branchId,
      branchName: userData.branchName,
      brandIds: userData.brandIds,
      status: userData.status as AccountStatus,
      mustChangePassword: userData.mustChangePassword ?? false,
    };

    setUser(authUser);
    setAccessToken(token);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user: authUser, token }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "/login";
  }, []);

  const changePassword = useCallback(async (_current: string, _newPass: string) => {
    // PRD §15: After password changed, session cleared and user must re-login
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(SESSION_KEY);
    // In a real implementation, call PATCH /api/v1/auth/change-password
    // For now, simulate success and redirect to login
    window.location.href = "/login?passwordChanged=true";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
