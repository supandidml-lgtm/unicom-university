import { describe, it, expect, beforeEach } from "vitest";
import { CertificatesService } from "./certificates.service";
import { DatabaseService } from "../../database/database.service";

describe("CertificatesService (V1.1 E-Certification)", () => {
  let service: CertificatesService;
  let db: DatabaseService;

  beforeEach(async () => {
    db = new DatabaseService();
    await db.seedInitialDatabase();
    service = new CertificatesService(db);
  });

  it("should retrieve existing certificates for a user", async () => {
    const certs = await service.getUserCertificates("usr-staff-1");
    expect(certs.length).toBeGreaterThan(0);
    expect(certs[0]?.certificateNumber).toContain("CERT/UNICOM");
  });

  it("should verify certificate by verification token", async () => {
    const cert = await service.verifyCertificate("vtok-uc10042-mi-2026-92847");
    expect(cert).toBeDefined();
    expect(cert.userName).toContain("Andi Pratama");
    expect(cert.status).toBe("ACTIVE");
  });

  it("should generate a new unique certificate", async () => {
    const newCert = await service.generateCertificate({
      userId: "usr-staff-2",
      programId: "prog-xiaomi-tech",
      finalScore: 88.0,
    });
    expect(newCert).toBeDefined();
    expect(newCert.certificateNumber).toContain("CERT/UNICOM/MI");
    expect(newCert.verificationToken).toBeDefined();
  });
});
