/**
 * Enterprise LMS Design Tokens for Unicom University
 * Conforming to Taste Skill: White-dominant background, crisp typography, clean borders, high information density.
 */

export const TOKENS = {
  colors: {
    background: {
      primary: "#ffffff", // Pure white dominant
      surface: "#f8fafc",    // Subtle light slate surface
      subtle: "#f1f5f9",     // Slightly darker slate for hover / selected
      dark: "#0f172a",       // Dark slate for contrast elements / sidebar accents
    },
    border: {
      default: "#e2e8f0",    // Crisp light border
      muted: "#f1f5f9",      // Soft divider
      strong: "#cbd5e1",     // Focus / active border
    },
    text: {
      primary: "#0f172a",    // Slate 900
      secondary: "#475569",  // Slate 600
      muted: "#94a3b8",      // Slate 400
      inverse: "#ffffff",    // White
    },
    brand: {
      primary: "#2563eb",    // Royal Blue (primary action)
      hover: "#1d4ed8",      // Darker blue
      light: "#eff6ff",      // 50 blue for active background
      ring: "rgba(37, 99, 235, 0.2)",
    },
    semantic: {
      success: {
        bg: "#ecfdf5",
        text: "#065f46",
        border: "#a7f3d0",
        solid: "#10b981",
      },
      warning: {
        bg: "#fffbeb",
        text: "#92400e",
        border: "#fde68a",
        solid: "#f59e0b",
      },
      danger: {
        bg: "#fef2f2",
        text: "#991b1b",
        border: "#fecaca",
        solid: "#ef4444",
      },
      info: {
        bg: "#f0f9ff",
        text: "#075985",
        border: "#bae6fd",
        solid: "#0ea5e9",
      },
    },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: "0.75rem",    // 12px
      sm: "0.875rem",   // 14px (Standard operational text)
      base: "1rem",     // 16px
      lg: "1.125rem",   // 18px
      xl: "1.25rem",    // 20px (Section title)
      "2xl": "1.5rem",  // 24px (Page heading)
      "3xl": "1.875rem" // 30px (Top-level view title)
    },
  },
  radii: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    default: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
} as const;
