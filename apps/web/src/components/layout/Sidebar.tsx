"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SystemRole } from "@unicom/types";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileBarChart,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: SystemRole[];
}

export interface SidebarProps {
  currentRole: SystemRole;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: "Program Training",
      href: "/training",
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      label: "Katalog Course",
      href: "/courses",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      label: "Monitoring & Report",
      href: "/reports",
      icon: <FileBarChart className="w-4 h-4" />,
      roles: [SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR],
    },
    {
      label: "Manajemen User",
      href: "/admin/users",
      icon: <Shield className="w-4 h-4" />,
      roles: [SystemRole.SUPER_ADMIN],
    },
    {
      label: "Audit Trail Log",
      href: "/admin/audit",
      icon: <FileBarChart className="w-4 h-4" />,
      roles: [SystemRole.SUPER_ADMIN],
    },
    {
      label: "Pengaturan Sistem",
      href: "/settings",
      icon: <Settings className="w-4 h-4" />,
      roles: [SystemRole.SUPER_ADMIN],
    },
  ];

  // Filter based on active preview role
  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(currentRole),
  );

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 h-full select-none ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-[6px] bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              U
            </div>
            <div className="flex flex-col truncate">
              <span className="font-bold text-slate-900 text-sm leading-tight tracking-tight">
                UNICOM
              </span>
              <span className="text-[11px] text-slate-500 font-medium tracking-wide">
                UNIVERSITY
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-8 h-8 rounded-[6px] bg-blue-600 flex items-center justify-center text-white font-bold text-sm mx-auto shadow-sm">
            U
          </div>
        )}

        {/* Collapse toggle on desktop */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-[4px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              } ${isCollapsed ? "justify-center px-2" : ""}`}
            >
              <span className={isActive ? "text-blue-600" : "text-slate-500"}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer / Scope info */}
      {!isCollapsed && (
        <div className="p-3 m-3 rounded-[6px] bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-0.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Role Context</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            {currentRole}
          </p>
        </div>
      )}
    </aside>
  );
};
