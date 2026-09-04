import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import {
  AuthSecurityEventType,
  CertificatePdfStatus,
  EnrollmentStatus,
  FileAssetPurpose,
  FileAssetStatus,
  prisma,
  SystemRoleCode,
  TrainingCertificateStatus,
  UserStatus,
} from '@unicom/database';
import { createHash, randomBytes } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { AuthRequestContext, SafeAuthenticatedUser } from '../auth/auth.types.js';
import { AuthSecurityEventService } from '../auth/auth-security-event.service.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { BrandAuthorizationService } from '../brands/brand-authorization.service.js';
import { MaterialStorageService } from '../materials/material-storage.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { CertificatePdfService } from './certificate-pdf.service.js';

const TEMPLATE_VERSION = 'CERTIFICATE_TEMPLATE_V1';

const certificateInclude = {
  enrollment: true,
  pdfFileAsset: true,
} as const;

@Injectable()
export class CertificateService {
  constructor(
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(BrandAuthorizationService) private readonly brands: BrandAuthorizationService,
    @Inject(AuthSecurityEventService) private readonly events: AuthSecurityEventService,
    @Inject(MaterialStorageService) private readonly storage: MaterialStorageService,
    @Inject(CertificatePdfService) private readonly pdf: CertificatePdfService,
    @Inject(NotificationService) private readonly notifications: NotificationService,
  ) {}

  async ensureCertificateForCompletedEnrollment(enrollmentId: string, issuedByUserId?: string) {
    const existing = await prisma.trainingCertificate.findUnique({
      where: { enrollmentId },
      include: certificateInclude,
    });
    if (existing) return existing;
    const enrollment = await prisma.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        participant: { include: { staffProfile: true } },
        brand: true,
        curriculumVersion: { include: { curriculum: true } },
      },
    });
    if (!enrollment) throw new NotFoundException('Training enrollment not found.');
    if (
      enrollment.status !== EnrollmentStatus.COMPLETED ||
      !enrollment.completedAt ||
      !enrollment.curriculumVersion ||
      !enrollment.participant.staffProfile
    ) {
      throw new ConflictException(
        'Only a canonically completed Enrollment may receive a certificate.',
      );
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const certificate = await prisma.$transaction(async (tx) => {
          const created = await tx.trainingCertificate.create({
            data: {
              enrollmentId: enrollment.id,
              participantUserId: enrollment.participantUserId,
              brandId: enrollment.brandId,
              curriculumVersionId: enrollment.curriculumVersionId!,
              certificateNumber: this.newCertificateNumber(),
              templateVersion: TEMPLATE_VERSION,
              participantNameSnapshot: enrollment.participant.staffProfile!.fullName,
              brandNameSnapshot: enrollment.brand.name,
              curriculumNameSnapshot: enrollment.curriculumVersion!.curriculum.name,
              curriculumVersionSnapshot: `Version ${enrollment.curriculumVersion!.versionNumber}`,
              completionDateSnapshot: enrollment.completedAt!,
              ...(issuedByUserId ? { issuedByUserId } : {}),
            },
            include: certificateInclude,
          });
          await tx.authSecurityEvent.create({
            data: {
              eventType: AuthSecurityEventType.CERTIFICATE_ISSUED,
              userId: issuedByUserId ?? enrollment.participantUserId,
              metadata: {
                certificateId: created.id,
                enrollmentId: enrollment.id,
                certificateNumber: created.certificateNumber,
              },
            },
          });
          return created;
        });
        return certificate;
      } catch (error) {
        if (!this.isUniqueConstraint(error)) throw error;
        const concurrent = await prisma.trainingCertificate.findUnique({
          where: { enrollmentId },
          include: certificateInclude,
        });
        if (concurrent) return concurrent;
      }
    }
    throw new ConflictException('Certificate issuance could not be completed safely.');
  }

  async issue(enrollmentId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const enrollment = await prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Training enrollment not found.');
    await this.brands.assertBrandAccess(actor, enrollment.brandId, context);
    return this.view(await this.ensureCertificateForCompletedEnrollment(enrollmentId, actor.id));
  }

  async listSelf(actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    await this.assertActiveTrainee(actor, context);
    const records = await prisma.trainingCertificate.findMany({
      where: { participantUserId: actor.id },
      include: certificateInclude,
      orderBy: { issuedAt: 'desc' },
    });
    return records.map((certificate) => this.view(certificate));
  }

  async get(certificateId: string, actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const certificate = await this.find(certificateId);
    await this.assertReadAccess(certificate, actor, context);
    return this.view(certificate);
  }

  async download(
    certificateId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ): Promise<{ stream: Readable; filename: string }> {
    const certificate = await this.find(certificateId);
    await this.assertReadAccess(certificate, actor, context);
    if (certificate.status === TrainingCertificateStatus.REVOKED)
      throw new ForbiddenException('A revoked certificate cannot be downloaded.');
    if (certificate.pdfStatus !== CertificatePdfStatus.READY || !certificate.pdfFileAsset)
      throw new ConflictException('Certificate PDF is not ready.');
    await this.events.record(AuthSecurityEventType.CERTIFICATE_DOWNLOADED, context, actor.id, {
      certificateId: certificate.id,
      certificateNumber: certificate.certificateNumber,
    });
    return {
      stream: await this.storage.stream(certificate.pdfFileAsset.storageKey),
      filename: this.safeFilename(certificate.certificateNumber),
    };
  }

  async revoke(
    certificateId: string,
    reason: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (!reason.trim()) throw new BadRequestException('Revocation reason is required.');
    if (!(await this.authorization.isSuperAdministrator(actor)))
      throw new ForbiddenException('Access denied.');
    const certificate = await this.find(certificateId);
    if (certificate.status === TrainingCertificateStatus.REVOKED) return this.view(certificate);
    const revoked = await prisma.trainingCertificate.update({
      where: { id: certificate.id },
      data: {
        status: TrainingCertificateStatus.REVOKED,
        revokedAt: new Date(),
        revokedByUserId: actor.id,
        revocationReason: reason.trim(),
      },
      include: certificateInclude,
    });
    await this.events.record(AuthSecurityEventType.CERTIFICATE_REVOKED, context, actor.id, {
      certificateId: revoked.id,
      certificateNumber: revoked.certificateNumber,
    });
    return this.view(revoked);
  }

  async regenerate(
    certificateId: string,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const certificate = await this.find(certificateId);
    await this.brands.assertBrandAccess(actor, certificate.brandId, context);
    if (certificate.status === TrainingCertificateStatus.REVOKED)
      throw new ConflictException('A revoked certificate cannot be regenerated.');
    await prisma.trainingCertificate.update({
      where: { id: certificate.id },
      data: { pdfStatus: CertificatePdfStatus.PENDING, pdfFailureCode: null },
    });
    return this.view(await this.find(certificate.id));
  }

  async processNext(): Promise<boolean> {
    await this.recoverExpiredLease();
    const candidate = await prisma.trainingCertificate.findFirst({
      where: { pdfStatus: CertificatePdfStatus.PENDING, status: TrainingCertificateStatus.ISSUED },
      orderBy: { issuedAt: 'asc' },
    });
    if (!candidate) return false;
    const claimed = await prisma.trainingCertificate.updateMany({
      where: {
        id: candidate.id,
        pdfStatus: CertificatePdfStatus.PENDING,
        status: TrainingCertificateStatus.ISSUED,
      },
      data: { pdfStatus: CertificatePdfStatus.PROCESSING, pdfFailureCode: null },
    });
    if (claimed.count !== 1) return true;
    try {
      const certificate = await this.find(candidate.id);
      const data = await this.pdf.render(certificate);
      const storageKey = certificate.pdfFileAsset?.storageKey ?? `certificates/${certificate.id}`;
      await this.storage.putBuffer(storageKey, data);
      const assetData = {
        originalFileName: this.safeFilename(certificate.certificateNumber),
        mimeType: 'application/pdf',
        detectedExtension: 'pdf',
        sizeBytes: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
        status: FileAssetStatus.READY,
        purpose: FileAssetPurpose.CERTIFICATE,
      };
      const asset = certificate.pdfFileAsset
        ? await prisma.fileAsset.update({
            where: { id: certificate.pdfFileAsset.id },
            data: assetData,
          })
        : await prisma.fileAsset.create({
            data: { storageProvider: 'private-certificate', storageKey, ...assetData },
          });
      const ready = await prisma.trainingCertificate.update({
        where: { id: certificate.id },
        data: {
          pdfStatus: CertificatePdfStatus.READY,
          pdfFileAssetId: asset.id,
          pdfFailureCode: null,
        },
      });
      await prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.CERTIFICATE_PDF_GENERATED,
          userId: ready.participantUserId,
          metadata: { certificateId: ready.id, certificateNumber: ready.certificateNumber },
        },
      });
      await this.queueReadyNotification(ready.id, ready.participantUserId, ready.certificateNumber);
    } catch {
      await prisma.trainingCertificate.updateMany({
        where: { id: candidate.id, pdfStatus: CertificatePdfStatus.PROCESSING },
        data: { pdfStatus: CertificatePdfStatus.FAILED, pdfFailureCode: 'PDF_GENERATION_FAILED' },
      });
      await prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.CERTIFICATE_PDF_FAILED,
          metadata: { certificateId: candidate.id, failureCode: 'PDF_GENERATION_FAILED' },
        },
      });
    }
    return true;
  }

  async backfill(batchSize = 100): Promise<{ examined: number; issued: number }> {
    const enrollments = await prisma.trainingEnrollment.findMany({
      where: { status: EnrollmentStatus.COMPLETED, completedAt: { not: null }, certificate: null },
      select: { id: true },
      take: Math.min(Math.max(batchSize, 1), 500),
      orderBy: { completedAt: 'asc' },
    });
    let issued = 0;
    for (const enrollment of enrollments) {
      await this.ensureCertificateForCompletedEnrollment(enrollment.id);
      issued += 1;
    }
    return { examined: enrollments.length, issued };
  }

  private async queueReadyNotification(
    certificateId: string,
    userId: string,
    certificateNumber: string,
  ) {
    try {
      await this.notifications.queueCertificateReady(userId, certificateId, certificateNumber);
      await prisma.authSecurityEvent.create({
        data: {
          eventType: AuthSecurityEventType.CERTIFICATE_READY_NOTIFICATION_QUEUED,
          userId,
          metadata: { certificateId, certificateNumber },
        },
      });
    } catch {
      /* delivery does not change certificate state */
    }
  }

  private async find(certificateId: string) {
    const certificate = await prisma.trainingCertificate.findUnique({
      where: { id: certificateId },
      include: certificateInclude,
    });
    if (!certificate) throw new NotFoundException('Certificate not found.');
    return certificate;
  }

  private async assertReadAccess(
    certificate: Awaited<ReturnType<CertificateService['find']>>,
    actor: SafeAuthenticatedUser,
    context: AuthRequestContext,
  ) {
    if (certificate.participantUserId === actor.id) return this.assertActiveTrainee(actor, context);
    await this.brands.assertBrandAccess(actor, certificate.brandId, context);
  }

  private async assertActiveTrainee(actor: SafeAuthenticatedUser, context: AuthRequestContext) {
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      include: { userRoles: { include: { role: true } } },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !user.userRoles.some(
        (item) => item.role.code === SystemRoleCode.Trainee && item.role.isActive,
      )
    ) {
      await this.events.record(AuthSecurityEventType.AUTHORIZATION_DENIED, context, actor.id, {
        reason: 'inactive_trainee_certificate',
      });
      throw new ForbiddenException('Access denied.');
    }
  }

  private view(certificate: Awaited<ReturnType<CertificateService['find']>>) {
    return {
      certificateId: certificate.id,
      certificateNumber: certificate.certificateNumber,
      brand: certificate.brandNameSnapshot,
      curriculum: `${certificate.curriculumNameSnapshot} / ${certificate.curriculumVersionSnapshot}`,
      completionDate: certificate.completionDateSnapshot,
      issuedAt: certificate.issuedAt,
      status: certificate.status,
      pdfStatus: certificate.pdfStatus,
      downloadable:
        certificate.status === TrainingCertificateStatus.ISSUED &&
        certificate.pdfStatus === CertificatePdfStatus.READY,
      ...(certificate.status === TrainingCertificateStatus.REVOKED
        ? { revokedAt: certificate.revokedAt, revocationReason: certificate.revocationReason }
        : {}),
    };
  }

  private newCertificateNumber(): string {
    return `UNICOM-${new Date().getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
  private safeFilename(number: string): string {
    return `UNICOM-Certificate-${number.replace(/[^A-Z0-9-]/g, '')}.pdf`;
  }
  private isUniqueConstraint(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private async recoverExpiredLease(): Promise<void> {
    const now = new Date();
    const expiredBefore = new Date(
      now.getTime() - loadApiEnvironment().WORKER_JOB_LEASE_SECONDS * 1_000,
    );
    await prisma.trainingCertificate.updateMany({
      where: {
        pdfStatus: CertificatePdfStatus.PROCESSING,
        updatedAt: { lt: expiredBefore },
      },
      data: {
        pdfStatus: CertificatePdfStatus.PENDING,
        pdfFailureCode: 'WORKER_LEASE_EXPIRED',
      },
    });
  }
}
