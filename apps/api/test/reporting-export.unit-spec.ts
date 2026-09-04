import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  participantExportFilename,
  ReportingExportService,
  spreadsheetLiteral,
} from '../src/modules/reporting/reporting-export.service.js';

describe('secure report XLSX export', () => {
  it('makes formula-capable user text literal and creates a safe filename', async () => {
    expect(spreadsheetLiteral('=HYPERLINK("https://evil.example")')).toBe(
      '\'=HYPERLINK("https://evil.example")',
    );
    expect(spreadsheetLiteral('+SUM(1,1)')).toBe("'+SUM(1,1)");
    expect(spreadsheetLiteral('-1+2')).toBe("'-1+2");
    expect(spreadsheetLiteral('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
    expect(participantExportFilename(new Date('2026-09-01T00:00:00.000Z'))).toBe(
      'unicom-university-participant-report-2026-09-01.xlsx',
    );

    const buffer = await new ReportingExportService().workbook(
      [
        {
          fullName: '=HYPERLINK("https://evil.example")',
          email: '+SUM(1,1)',
          phoneNumber: '-1+2',
          maskedNik: '1234********5678',
          brandCode: '@SUM(A1:A2)',
          brandName: 'Brand',
          enrollmentStatus: 'IN_PROGRESS',
          curriculumVersion: 'ONBOARD v1',
          plannedWeekCount: 1,
          overallProgressBasisPoints: 5_000,
          materialProgressBasisPoints: 5_000,
          examProgressBasisPoints: 0,
          completedMaterialCount: 1,
          requiredMaterialCount: 2,
          passedExamCount: 0,
          requiredExamCount: 1,
          startedAt: null,
          completedAt: null,
          latestActivityAt: null,
        },
      ],
      { requestedBy: 'reporter@example.test', filters: '{}' },
    );
    const workbook = new ExcelJS.Workbook();
    // exceljs declares its input as an ArrayBuffer-shaped Buffer, unlike Node's generic Buffer.
    const binary = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(binary).set(buffer);
    await workbook.xlsx.load(binary);
    const sheet = workbook.getWorksheet('Participant Training Report')!;
    expect(sheet.getCell('A2').value).toBe('\'=HYPERLINK("https://evil.example")');
    expect(sheet.getCell('B2').value).toBe("'+SUM(1,1)");
    expect(sheet.getCell('E2').value).toBe("'@SUM(A1:A2) — Brand");
    expect(String(sheet.getCell('A2').value)).not.toContain('{');
  });
});
