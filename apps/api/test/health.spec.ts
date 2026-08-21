import { describe, it, expect, beforeEach } from "vitest";
import { HealthService } from "../src/modules/health/health.service";
import { HealthController } from "../src/modules/health/health.controller";

describe("HealthModule Probes (PRD §108)", () => {
  let healthService: HealthService;
  let healthController: HealthController;

  beforeEach(() => {
    healthService = new HealthService();
    healthController = new HealthController(healthService);
  });

  it("should return healthy status on GET /health", () => {
    const res = healthController.checkHealth();
    expect(res.status).toBe("healthy");
    expect(res.service).toBe("unicom-university-api");
    expect(res.version).toBe("1.0.0");
    expect(typeof res.uptimeSeconds).toBe("number");
    expect(typeof res.timestamp).toBe("string");
  });

  it("should return up status on GET /health/liveness", () => {
    const res = healthController.checkLiveness();
    expect(res.status).toBe("up");
    expect(typeof res.timestamp).toBe("string");
  });

  it("should return ready status on GET /health/readiness", () => {
    const res = healthController.checkReadiness();
    expect(res.status).toBe("ready");
    expect(res.database).toBe("connected");
    expect(res.redis).toBe("connected");
  });
});
