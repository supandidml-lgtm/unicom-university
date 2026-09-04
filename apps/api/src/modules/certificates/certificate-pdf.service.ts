import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface CertificatePdfSnapshot {
  participantNameSnapshot: string;
  brandNameSnapshot: string;
  curriculumNameSnapshot: string;
  curriculumVersionSnapshot: string;
  completionDateSnapshot: Date;
  certificateNumber: string;
}

@Injectable()
export class CertificatePdfService {
  async render(snapshot: CertificatePdfSnapshot): Promise<Buffer> {
    const value = (input: string, max = 180) =>
      [...input]
        .map((character) => {
          const code = character.charCodeAt(0);
          return code < 32 || code === 127 ? ' ' : character;
        })
        .join('')
        .trim()
        .slice(0, max);
    const date = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(snapshot.completionDateSnapshot);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const document = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 56,
        info: { Title: 'UNICOM Certificate of Completion', Author: 'UNICOM UNIVERSITY' },
      });
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.rect(0, 0, 842, 595).fill('#f8fafc');
      document.rect(24, 24, 794, 547).lineWidth(3).stroke('#0b3a67');
      document
        .fillColor('#0b3a67')
        .font('Helvetica-Bold')
        .fontSize(24)
        .text('UNICOM UNIVERSITY', { align: 'center' });
      document.moveDown(1.2).fontSize(28).text('CERTIFICATE OF COMPLETION', { align: 'center' });
      document
        .moveDown(1.4)
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#334155')
        .text('This certifies that', { align: 'center' });
      document
        .moveDown(0.7)
        .font('Helvetica-Bold')
        .fontSize(27)
        .fillColor('#0f172a')
        .text(value(snapshot.participantNameSnapshot), { align: 'center' });
      document
        .moveDown(0.9)
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#334155')
        .text('has successfully completed', { align: 'center' });
      document
        .moveDown(0.55)
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#0f172a')
        .text(value(snapshot.brandNameSnapshot), { align: 'center' });
      document
        .moveDown(0.8)
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#334155')
        .text(
          `Curriculum: ${value(snapshot.curriculumNameSnapshot)} / ${value(snapshot.curriculumVersionSnapshot, 80)}`,
          { align: 'center' },
        );
      document.moveDown(0.45).text(`Completion Date: ${date}`, { align: 'center' });
      document
        .moveDown(1.2)
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0b3a67')
        .text(`Certificate Number: ${value(snapshot.certificateNumber, 64)}`, { align: 'center' });
      document.end();
    });
  }
}
