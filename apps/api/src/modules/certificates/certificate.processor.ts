import { Inject, Injectable } from '@nestjs/common';
import { CertificateService } from './certificate.service.js';

@Injectable()
export class CertificateProcessor {
  constructor(@Inject(CertificateService) private readonly certificates: CertificateService) {}
  processNext(): Promise<boolean> {
    return this.certificates.processNext();
  }
}
