import { describe, expect, it } from 'vitest';
import { CertificatePdfService } from '../src/modules/certificates/certificate-pdf.service.js';

describe('CertificatePdfService', () => {
  it('renders a non-empty PDF while replacing dynamic control characters', async () => {
    const data = await new CertificatePdfService().render({
      participantNameSnapshot: 'Participant\u0000 Name',
      brandNameSnapshot: 'Brand\nName',
      curriculumNameSnapshot: 'Curriculum',
      curriculumVersionSnapshot: 'Version 1',
      completionDateSnapshot: new Date('2026-09-03T00:00:00.000Z'),
      certificateNumber: 'UNICOM-2026-ABCDEF12',
    });
    expect(data.subarray(0, 5).toString()).toBe('%PDF-');
    expect(data.length).toBeGreaterThan(500);
  });
});
