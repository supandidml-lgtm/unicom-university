import { Controller, Get, Inject } from '@nestjs/common';
import type { ServiceHealth } from '@unicom/types';
import { healthResponseSchema } from '@unicom/validation';
import { ReadinessService } from './readiness.service.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(ReadinessService) private readonly readinessService: ReadinessService) {}

  @Get()
  getHealth(): ServiceHealth {
    return this.createHealthResponse();
  }

  @Get('live')
  getLiveness(): ServiceHealth {
    return this.createHealthResponse();
  }

  @Get('ready')
  async getReadiness(): Promise<ServiceHealth> {
    await this.readinessService.verify();
    return this.createHealthResponse();
  }

  private createHealthResponse(): ServiceHealth {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
      environment: process.env['APP_ENV'] ?? 'development',
      timestamp: new Date().toISOString(),
    });
  }
}
