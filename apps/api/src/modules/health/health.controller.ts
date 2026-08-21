import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  checkHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get("liveness")
  checkLiveness() {
    return this.healthService.getLivenessStatus();
  }

  @Get("readiness")
  checkReadiness() {
    return this.healthService.getReadinessStatus();
  }
}
