import { Controller, Get, Post } from "@nestjs/common";
import { HealthService } from "./health.service.js";
import { DatabaseService } from "../../database/database.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly databaseService: DatabaseService,
  ) {}

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

  @Post("seed")
  async reseed() {
    await this.databaseService.seedInitialDatabase();
    return {
      success: true,
      message: "Database reseeded successfully with authoritative Master PRD datasets.",
    };
  }
}
