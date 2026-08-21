import React from "react";
import { cn } from "../utils";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className,
  label = "Memuat...",
}) => {
  const sizeStyles = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-2">
      <div
        className={cn(
          "rounded-full animate-spin border-slate-200 border-t-blue-600",
          sizeStyles[size],
          className,
        )}
        role="status"
        aria-label={label}
      />
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
    </div>
  );
};
