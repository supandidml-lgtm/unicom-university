import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SystemRole } from "@unicom/types";

@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // PUBLIC ENDPOINT FOR QR VERIFICATION
  @Get("verify/:token")
  async verify(@Param("token") token: string) {
    return this.certificatesService.verifyCertificate(token);
  }

  @Get("user/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER, SystemRole.SUPERVISOR, SystemRole.STAFF)
  async getUserCertificates(@Param("userId") userId: string) {
    return this.certificatesService.getUserCertificates(userId);
  }

  @Post("generate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.TRAINER)
  async generate(@Body() body: { userId: string; programId: string; finalScore?: number }) {
    return this.certificatesService.generateCertificate(body);
  }
}
