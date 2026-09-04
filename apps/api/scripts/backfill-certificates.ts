import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { CertificateService } from '../src/modules/certificates/certificate.service.js';

async function main(): Promise<void> {
  const context = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const certificates = context.get(CertificateService);
    const result = await certificates.backfill();
    process.stdout.write(
      `Certificate backfill examined=${result.examined} issued=${result.issued}\n`,
    );
  } finally {
    await context.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write('Certificate backfill failed.\n');
  process.exitCode = 1;
});
