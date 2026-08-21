import React from "react";
import { cn } from "../utils";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  dot = false,
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-red-800 border-red-200",
    info: "bg-sky-50 text-sky-800 border-sky-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const dotStyles = {
    default: "bg-blue-600",
    success: "bg-emerald-600",
    warning: "bg-amber-600",
    danger: "bg-red-600",
    info: "bg-sky-600",
    neutral: "bg-slate-500",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1 rounded-[4px]",
    md: "px-2.5 py-1 text-xs gap-1.5 rounded-[4px]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium border select-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotStyles[variant])} />}
      {children}
    </span>
  );
};
