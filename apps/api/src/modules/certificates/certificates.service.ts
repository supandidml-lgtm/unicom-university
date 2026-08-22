import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { Certificate } from "@unicom/types";

@Injectable()
export class CertificatesService {
  constructor(private databaseService: DatabaseService) {}

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return this.databaseService.certificates.filter((c) => c.userId === userId);
  }

  async verifyCertificate(token: string): Promise<Certificate> {
    const cert = this.databaseService.certificates.find(
      (c) => c.verificationToken === token || c.certificateNumber === token,
    );
    if (!cert) {
      throw new NotFoundException("Sertifikat tidak valid atau tidak ditemukan.");
    }
    return cert;
  }

  async generateCertificate(dto: {
    userId: string;
    programId: string;
    finalScore?: number;
  }): Promise<Certificate> {
    const user = this.databaseService.users.find((u) => u.id === dto.userId);
    if (!user) throw new NotFoundException("Pengguna tidak ditemukan.");

    const program = this.databaseService.programs.find((p) => p.id === dto.programId);
    if (!program) throw new NotFoundException("Program pelatihan tidak ditemukan.");

    const brand = this.databaseService.brands.find((b) => b.id === program.brandId);
    const brandCode = brand?.code || "GEN";

    // Check existing
    const existing = this.databaseService.certificates.find(
      (c) => c.userId === dto.userId && c.programId === dto.programId,
    );
    if (existing) return existing;

    const seq = String(this.databaseService.certificates.length + 1001).padStart(6, "0");
    const certNumber = `CERT/UNICOM/${brandCode}/2026/${seq}`;
    const token = `vtok-${user.nik.toLowerCase()}-${brandCode.toLowerCase()}-${Date.now().toString(36)}`;

    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      certificateNumber: certNumber,
      userId: user.id,
      userName: user.name,
      userNik: user.nik,
      programId: program.id,
      programTitle: program.title,
      brandId: program.brandId,
      brandName: brand?.name || "Official Brand",
      finalScore: dto.finalScore || 90.0,
      issuedAt: new Date().toISOString(),
      verificationToken: token,
      verificationUrl: `https://unicom-university-web.vercel.app/verify/${token}`,
      status: "ACTIVE",
    };

    this.databaseService.certificates.push(newCert);

    this.databaseService.logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "CERTIFICATE_ISSUED",
      resource: "CERTIFICATE",
      resourceId: newCert.id,
      details: { certNumber, programTitle: program.title },
    });

    return newCert;
  }
}
