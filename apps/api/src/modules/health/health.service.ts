import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  getHealthStatus() {
    return {
      status: "healthy",
      service: "unicom-university-api",
      version: "1.0.0",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  getLivenessStatus() {
    return {
      status: "up",
      timestamp: new Date().toISOString(),
    };
  }

  getReadinessStatus() {
    return {
      status: "ready",
      database: "connected",
      redis: "connected",
      timestamp: new Date().toISOString(),
    };
  }
}
