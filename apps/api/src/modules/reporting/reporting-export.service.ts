import ExcelJS from 'exceljs';
import { Injectable } from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';

export type ParticipantExportRow = {
  fullName: string;
  email: string;
  phoneNumber: string;
  maskedNik: string;
  brandCode: string;
  brandName: string;
  enrollmentStatus: string;
  curriculumVersion: string | null;
  plannedWeekCount: number;
  overallProgressBasisPoints: number;
  materialProgressBasisPoints: number;
  examProgressBasisPoints: number;
  completedMaterialCount: number;
  requiredMaterialCount: number;
  passedExamCount: number;
  requiredExamCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  latestActivityAt: Date | null;
};

export function spreadsheetLiteral(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function participantExportFilename(now = new Date()): string {
  return `unicom-university-participant-report-${now.toISOString().slice(0, 10)}.xlsx`;
}

@Injectable()
export class ReportingExportService {
  private readonly environment = loadApiEnvironment();

  async workbook(
    rows: ParticipantExportRow[],
    metadata: { requestedBy: string; filters: string },
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UNICOM UNIVERSITY';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Participant Training Report', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const columns: [string, number][] = [
      ['Participant Name', 28],
      ['Email', 30],
      ['Phone', 20],
      ['Masked NIK', 20],
      ['Brand', 24],
      ['Enrollment Status', 18],
      ['Curriculum Version', 20],
      ['Planned Weeks', 14],
      ['Overall Progress %', 18],
      ['Material Progress %', 18],
      ['Exam Progress %', 16],
      ['Materials Completed', 20],
      ['Materials Required', 19],
      ['Exams Passed', 14],
      ['Exams Required', 16],
      ['Started At', 22],
      ['Completed At', 22],
      ['Latest Activity', 22],
    ];
    sheet.columns = columns.map(([header, width]) => ({ header, key: header, width }));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      const output = sheet.addRow([
        spreadsheetLiteral(row.fullName),
        spreadsheetLiteral(row.email),
        spreadsheetLiteral(row.phoneNumber),
        spreadsheetLiteral(row.maskedNik),
        spreadsheetLiteral(`${row.brandCode} — ${row.brandName}`),
        row.enrollmentStatus,
        spreadsheetLiteral(row.curriculumVersion ?? ''),
        row.plannedWeekCount,
        row.overallProgressBasisPoints / 100,
        row.materialProgressBasisPoints / 100,
        row.examProgressBasisPoints / 100,
        row.completedMaterialCount,
        row.requiredMaterialCount,
        row.passedExamCount,
        row.requiredExamCount,
        this.timestamp(row.startedAt),
        this.timestamp(row.completedAt),
        this.timestamp(row.latestActivityAt),
      ]);
      for (const column of [9, 10, 11]) output.getCell(column).numFmt = '0.00';
    }
    const meta = workbook.addWorksheet('Report Metadata');
    meta.columns = [{ width: 24 }, { width: 80 }];
    meta.addRows([
      ['Report Name', 'Participant Training Report'],
      ['Generated At', this.timestamp(new Date())],
      ['Timezone', this.environment.REPORTING_TIMEZONE],
      ['Requested By', spreadsheetLiteral(metadata.requestedBy)],
      ['Applied Filters', spreadsheetLiteral(metadata.filters)],
      ['Row Count', rows.length],
    ]);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private timestamp(value: Date | null): string {
    if (!value) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.environment.REPORTING_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part(
      'second',
    )} ${this.environment.REPORTING_TIMEZONE}`;
  }
}
