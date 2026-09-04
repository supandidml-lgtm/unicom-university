import { Inject, Injectable } from '@nestjs/common';
import {
  FileAssetStatus,
  MaterialSourceExtractionStatus,
  MaterialSourceLocatorType,
  MaterialType,
  prisma,
} from '@unicom/database';
import type { Prisma } from '@unicom/database';
import { inflateRawSync } from 'node:zlib';
import { MaterialStorageService } from '../materials/material-storage.service.js';
import { VideoTranscriptionService } from './video-transcription.service.js';

const EXTRACTOR_VERSION = 'SOURCE_EXTRACTION_V1';

@Injectable()
export class MaterialSourceExtractionService {
  constructor(
    @Inject(MaterialStorageService) private readonly storage: MaterialStorageService,
    @Inject(VideoTranscriptionService) private readonly transcription: VideoTranscriptionService,
  ) {}

  async readyChunks(materialIds: string[], maximumChars: number) {
    const materials = await prisma.learningMaterial.findMany({
      where: { id: { in: materialIds }, fileAsset: { status: FileAssetStatus.READY } },
      include: { fileAsset: true },
    });
    const chunks = [] as {
      id: string;
      materialId: string;
      content: string;
      locatorType: MaterialSourceLocatorType;
      locator: Record<string, unknown>;
    }[];
    for (const material of materials) {
      const extraction = await this.ensure(material.id, material.type, material.fileAsset);
      if (extraction.status !== MaterialSourceExtractionStatus.READY) continue;
      const extracted = await prisma.materialSourceChunk.findMany({
        where: { extractionId: extraction.id },
        orderBy: { sequence: 'asc' },
      });
      for (const chunk of extracted) {
        if (chunks.reduce((total, item) => total + item.content.length, 0) >= maximumChars) break;
        chunks.push({
          id: chunk.id,
          materialId: material.id,
          content: chunk.content.slice(
            0,
            Math.max(
              0,
              maximumChars - chunks.reduce((total, item) => total + item.content.length, 0),
            ),
          ),
          locatorType: chunk.locatorType,
          locator: chunk.locator as Record<string, unknown>,
        });
      }
    }
    return chunks;
  }

  private async ensure(
    materialId: string,
    type: MaterialType,
    asset: { id: string; status: FileAssetStatus; storageKey: string; detectedExtension: string },
  ) {
    const existing = await prisma.materialSourceExtraction.findUnique({
      where: {
        fileAssetId_extractorVersion: {
          fileAssetId: asset.id,
          extractorVersion: EXTRACTOR_VERSION,
        },
      },
    });
    if (existing?.status === MaterialSourceExtractionStatus.READY) return existing;
    const extraction =
      existing ??
      (await prisma.materialSourceExtraction.create({
        data: { fileAssetId: asset.id, sourceType: type, extractorVersion: EXTRACTOR_VERSION },
      }));
    if (asset.status !== FileAssetStatus.READY) return extraction;
    await prisma.materialSourceExtraction.update({
      where: { id: extraction.id },
      data: { status: MaterialSourceExtractionStatus.PROCESSING, failureCode: null },
    });
    try {
      const bytes = await this.read(asset.storageKey, 25 * 1024 * 1024);
      const chunks =
        type === MaterialType.VIDEO
          ? await this.transcription.transcribe(bytes)
          : extract(type, asset.detectedExtension, bytes);
      if (chunks.length === 0) throw new Error('UNSUPPORTED_SOURCE');
      return await prisma.$transaction(async (transaction) => {
        await transaction.materialSourceChunk.deleteMany({
          where: { extractionId: extraction.id },
        });
        await transaction.materialSourceChunk.createMany({
          data: chunks.map((chunk, index) => ({
            extractionId: extraction.id,
            sequence: index + 1,
            content: chunk.content,
            locatorType: chunk.locatorType,
            locator: chunk.locator as Prisma.InputJsonValue,
          })),
        });
        return transaction.materialSourceExtraction.update({
          where: { id: extraction.id },
          data: {
            status: MaterialSourceExtractionStatus.READY,
            extractedAt: new Date(),
            metadata: { materialId, chunkCount: chunks.length },
          },
        });
      });
    } catch (error) {
      const failureCode =
        error instanceof Error && error.message === 'UNSUPPORTED_SOURCE'
          ? 'UNSUPPORTED_SOURCE'
          : 'SOURCE_EXTRACTION_FAILED';
      return prisma.materialSourceExtraction.update({
        where: { id: extraction.id },
        data: { status: MaterialSourceExtractionStatus.FAILED, failureCode },
      });
    }
  }

  private async read(storageKey: string, maxBytes: number) {
    const stream = await this.storage.stream(storageKey);
    const buffers: Buffer[] = [];
    let size = 0;
    for await (const value of stream) {
      const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
      size += buffer.length;
      if (size > maxBytes) throw new Error('SOURCE_EXTRACTION_FAILED');
      buffers.push(buffer);
    }
    return Buffer.concat(buffers);
  }
}

type ExtractedChunk = {
  content: string;
  locatorType: MaterialSourceLocatorType;
  locator: Prisma.InputJsonObject;
};

function extract(type: MaterialType, extension: string, data: Buffer): ExtractedChunk[] {
  if (type === MaterialType.PDF) return extractPdf(data);
  if (type === MaterialType.DOCUMENT && extension === '.txt')
    return textChunks(data.toString('utf8'), MaterialSourceLocatorType.DOCUMENT_SECTION, 'Text');
  if (type === MaterialType.DOCUMENT && extension === '.docx') return extractDocx(data);
  if (type === MaterialType.SPREADSHEET && extension === '.xlsx') return extractXlsx(data);
  // Video needs a configured, controlled transcription pipeline; images require an explicitly visual provider.
  throw new Error('UNSUPPORTED_SOURCE');
}

function extractPdf(data: Buffer): ExtractedChunk[] {
  const text = data.toString('latin1');
  const pages = text.split(/\/Type\s*\/Page(?!s)\b/).slice(1);
  return pages
    .map((page, index) => ({
      content: printablePdfText(page),
      locatorType: MaterialSourceLocatorType.PDF_PAGE,
      locator: { pageNumber: index + 1 },
    }))
    .filter((chunk) => chunk.content.length > 0);
}

function printablePdfText(value: string) {
  return value
    .replace(/\(([^()]*)\)\s*Tj/g, '$1 ')
    .replace(/[^\x20-\x7e\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20_000);
}

function textChunks(
  content: string,
  locatorType: MaterialSourceLocatorType,
  label: string,
): ExtractedChunk[] {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const size = 8_000;
  return Array.from({ length: Math.ceil(normalized.length / size) }, (_, index) => ({
    content: normalized.slice(index * size, (index + 1) * size),
    locatorType,
    locator: { sectionLabel: `${label} ${index + 1}` },
  }));
}

function extractDocx(data: Buffer): ExtractedChunk[] {
  const documentXml = zipEntries(data).get('word/document.xml');
  if (!documentXml) throw new Error('UNSUPPORTED_SOURCE');
  const paragraphs = documentXml
    .toString('utf8')
    .split(/<w:p[ >]/)
    .map((paragraph) => xmlText(paragraph))
    .filter(Boolean);
  return paragraphs.map((content, index) => ({
    content,
    locatorType: MaterialSourceLocatorType.DOCUMENT_SECTION,
    locator: { sectionLabel: `Paragraph ${index + 1}` },
  }));
}

function extractXlsx(data: Buffer): ExtractedChunk[] {
  const entries = zipEntries(data);
  const shared = entries.get('xl/sharedStrings.xml');
  const sharedStrings = shared
    ? [...shared.toString('utf8').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) =>
        xmlText(match[1]!),
      )
    : [];
  const sheets = [...entries.entries()].filter((entry) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(entry[0]),
  );
  const chunks: ExtractedChunk[] = [];
  sheets.forEach((entry, sheetIndex) => {
    const xml = entry[1];
    const rows = [...xml.toString('utf8').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
    rows.forEach((row) => {
      const cells = [
        ...row[1]!.matchAll(/<c[^>]*r="([A-Z]+\d+)"[^>]*?(?:t="(s)")?[^>]*>([\s\S]*?)<\/c>/g),
      ];
      const values = cells.map((cell) => {
        const raw = xmlText(cell[3]!);
        return cell[2] === 's' ? (sharedStrings[Number(raw)] ?? '') : raw;
      });
      const first = cells[0]?.[1];
      const last = cells.at(-1)?.[1];
      if (first && last && values.some(Boolean)) {
        chunks.push({
          content: values.join(' | ').slice(0, 8_000),
          locatorType: MaterialSourceLocatorType.SPREADSHEET_RANGE,
          locator: { sheetName: `Sheet ${sheetIndex + 1}`, cellRange: `${first}:${last}` },
        });
      }
    });
  });
  return chunks;
}

function zipEntries(data: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 <= data.length && data.readUInt32LE(offset) === 0x04034b50) {
    const method = data.readUInt16LE(offset + 8);
    const compressedSize = data.readUInt32LE(offset + 18);
    const nameLength = data.readUInt16LE(offset + 26);
    const extraLength = data.readUInt16LE(offset + 28);
    const name = data.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const start = offset + 30 + nameLength + extraLength;
    const compressed = data.subarray(start, start + compressedSize);
    if (compressed.length !== compressedSize) break;
    if (method === 0) entries.set(name, compressed);
    if (method === 8) entries.set(name, inflateRawSync(compressed));
    offset = start + compressedSize;
  }
  return entries;
}

function xmlText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
