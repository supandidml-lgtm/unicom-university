"use client";

import React, { useState } from "react";
import { SystemRole } from "@unicom/types";
import { Menu, Bell, User, CheckCircle2, Check, ExternalLink } from "lucide-react";
import { Badge } from "@unicom/ui";

export interface HeaderProps {
  currentRole: SystemRole;
  onRoleChange: (role: SystemRole) => void;
  onToggleMobileMenu: () => void;
  pageTitle?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  time: string;
  isRead: boolean;
  linkUrl: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onToggleMobileMenu,
  pageTitle = "Dashboard",
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n-1",
      title: "Penugasan Training Baru",
      message: "Anda telah ditugaskan ke program Xiaomi Certified Technician Training.",
      type: "ASSIGNMENT",
      time: "12 jam lalu",
      isRead: false,
      linkUrl: "/training",
    },
    {
      id: "n-2",
      title: "Hasil Ujian Week 1",
      message: "Selamat! Anda Lulus Ujian Evaluasi Week 1 dengan skor 90/100.",
      type: "EXAM_GRADED",
      time: "4 jam lalu",
      isRead: false,
      linkUrl: "/courses",
    },
    {
      id: "n-3",
      title: "Pengingat Deadline",
      message: "Batas waktu penyelesaian Week 2 tersisa 6 hari lagi.",
      type: "DEADLINE_ALERT",
      time: "1 hari lalu",
      isRead: true,
      linkUrl: "/courses",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 select-none relative z-30">
      {/* Left: Mobile Menu Trigger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 rounded-[4px] text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-base md:text-lg font-semibold text-slate-900">
            {pageTitle}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Phase 1–20 Ready
          </span>
        </div>
      </div>

      {/* Right: Role Switcher & Profile Context */}
      <div className="flex items-center gap-3">
        {/* Role Preview Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-[6px] border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase px-2 hidden lg:inline-block">
            Preview Role:
          </span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as SystemRole)}
            className="text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-[4px] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
          >
            <option value={SystemRole.SUPER_ADMIN}>Super Admin</option>
            <option value={SystemRole.TRAINER}>Trainer</option>
            <option value={SystemRole.SUPERVISOR}>Supervisor</option>
            <option value={SystemRole.STAFF}>Staff (Trainee)</option>
          </select>
        </div>

        {/* Notifications Icon with Interactive Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative p-2 rounded-[6px] transition-colors ${
              isNotifOpen
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-[8px] shadow-xl overflow-hidden z-50">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Notifikasi Sistem
                  </h4>
                  {unreadCount > 0 && (
                    <Badge variant="default" size="sm">
                      {unreadCount} Baru
                    </Badge>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Tandai Semua Dibaca</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 text-xs transition-colors ${
                      n.isRead ? "bg-white text-slate-600" : "bg-blue-50/50 text-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-semibold text-slate-900">{n.title}</h5>
                      <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <a
                        href={n.linkUrl}
                        onClick={() => {
                          handleMarkAsRead(n.id);
                          setIsNotifOpen(false);
                        }}
                        className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Lihat Detail</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="text-[10px] text-slate-400 hover:text-slate-600"
                        >
                          Tandai sudah dibaca
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-none">
              {currentRole === SystemRole.SUPER_ADMIN
                ? "Ahmad Fauzi"
                : currentRole === SystemRole.TRAINER
                ? "Budi Santoso"
                : currentRole === SystemRole.SUPERVISOR
                ? "Chandra Wijaya"
                : "Andi Pratama"}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {currentRole === SystemRole.SUPER_ADMIN
                ? "NIK: ADM001"
                : currentRole === SystemRole.TRAINER
                ? "NIK: TRN001"
                : currentRole === SystemRole.SUPERVISOR
                ? "NIK: SPV001"
                : "NIK: UC10042"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
