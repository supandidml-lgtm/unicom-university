import React from "react";
import { cn } from "../utils";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  label?: string;
  showValueLabel?: boolean;
  variant?: "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  className,
  value,
  label,
  showValueLabel = true,
  variant = "primary",
  size = "md",
  ...props
}) => {
  const boundedValue = Math.min(100, Math.max(0, value));

  const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const variantStyles = {
    primary: "bg-blue-600",
    success: "bg-emerald-600",
    warning: "bg-amber-500",
    danger: "bg-red-600",
  };

  return (
    <div className={cn("w-full flex flex-col gap-1.5", className)} {...props}>
      {(label || showValueLabel) && (
        <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
          {label && <span>{label}</span>}
          {showValueLabel && (
            <span className="font-semibold text-slate-900 ml-auto">{Math.round(boundedValue)}%</span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60",
          sizeStyles[size],
        )}
        role="progressbar"
        aria-valuenow={boundedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full transition-all duration-300 rounded-full", variantStyles[variant])}
          style={{ width: `${boundedValue}%` }}
        />
      </div>
    </div>
  );
};
