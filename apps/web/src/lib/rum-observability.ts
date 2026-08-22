"use client";

export interface RumMetric {
  name: "LCP" | "INP" | "CLS" | "FCP" | "TTFB" | "ROUTE_CHANGE";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  route: string;
  timestamp: string;
  deviceType: "mobile" | "tablet" | "desktop";
  connectionType?: string;
  branchId?: string;
  releaseVersion: string;
}

export interface FrontendErrorEvent {
  errorId: string;
  traceId: string;
  type: "JS_ERROR" | "REACT_BOUNDARY" | "UNHANDLED_PROMISE" | "API_FAILURE" | "MEDIA_FAILURE";
  message: string;
  stack?: string;
  route: string;
  timestamp: string;
  releaseVersion: string;
  metadata?: Record<string, unknown>;
}

const RELEASE_VERSION = "v1.1.0";

export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

class ObservabilityManager {
  private errorQueue: FrontendErrorEvent[] = [];
  private metricsQueue: RumMetric[] = [];
  private isFlushing = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initGlobalListeners();
      this.initWebVitalsObserver();
    }
  }

  private initGlobalListeners() {
    window.addEventListener("error", (event) => {
      this.recordError({
        errorId: `err-${Date.now()}`,
        traceId: generateTraceId(),
        type: "JS_ERROR",
        message: event.message || "Unknown JavaScript error",
        stack: event.error?.stack,
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
        releaseVersion: RELEASE_VERSION,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.recordError({
        errorId: `err-promise-${Date.now()}`,
        traceId: generateTraceId(),
        type: "UNHANDLED_PROMISE",
        message: event.reason?.message || String(event.reason) || "Unhandled Promise Rejection",
        stack: event.reason?.stack,
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
        releaseVersion: RELEASE_VERSION,
      });
    });
  }

  private initWebVitalsObserver() {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (lastEntry) {
          const val = Math.round(lastEntry.startTime);
          this.recordMetric({
            name: "LCP",
            value: val,
            rating: val <= 2500 ? "good" : val <= 4000 ? "needs-improvement" : "poor",
            route: window.location.pathname,
            timestamp: new Date().toISOString(),
            deviceType: getDeviceType(),
            releaseVersion: RELEASE_VERSION,
          });
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

      // First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcp = entries.find((e) => e.name === "first-contentful-paint");
        if (fcp) {
          const val = Math.round(fcp.startTime);
          this.recordMetric({
            name: "FCP",
            value: val,
            rating: val <= 1800 ? "good" : val <= 3000 ? "needs-improvement" : "poor",
            route: window.location.pathname,
            timestamp: new Date().toISOString(),
            deviceType: getDeviceType(),
            releaseVersion: RELEASE_VERSION,
          });
        }
      });
      fcpObserver.observe({ type: "paint", buffered: true });
    } catch {
      // PerformanceObserver not fully supported or restricted
    }
  }

  public recordMetric(metric: RumMetric) {
    this.metricsQueue.push(metric);
    if (this.metricsQueue.length >= 5) {
      this.flush();
    }
  }

  public recordError(error: FrontendErrorEvent) {
    this.errorQueue.push(error);
    console.warn(`[Observability] Captured ${error.type}: ${error.message} (Trace: ${error.traceId})`);
    this.flush();
  }

  public flush() {
    if (this.isFlushing || (this.errorQueue.length === 0 && this.metricsQueue.length === 0)) return;
    this.isFlushing = true;

    const payload = {
      errors: [...this.errorQueue],
      metrics: [...this.metricsQueue],
    };

    this.errorQueue = [];
    this.metricsQueue = [];
    this.isFlushing = false;

    // Store in Local Session Audit Log
    try {
      const storedLogs = JSON.parse(sessionStorage.getItem("unicom_rum_logs") || "[]");
      storedLogs.push(...payload.metrics, ...payload.errors);
      sessionStorage.setItem("unicom_rum_logs", JSON.stringify(storedLogs.slice(-100)));
    } catch {}
  }
}

export const observability = new ObservabilityManager();
