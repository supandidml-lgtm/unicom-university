import { Injectable } from '@nestjs/common';
import { MaterialType } from '@unicom/database';
import { open } from 'node:fs/promises';

@Injectable()
export class MaterialMetadataService {
  async extract(
    type: MaterialType,
    path: string,
  ): Promise<{ durationMs: number | null; pageCount: number | null }> {
    if (type === MaterialType.VIDEO)
      return { durationMs: await this.mp4Duration(path), pageCount: null };
    if (type === MaterialType.PDF)
      return { durationMs: null, pageCount: await this.pdfPageCount(path) };
    return { durationMs: null, pageCount: null };
  }

  private async mp4Duration(path: string): Promise<number | null> {
    const buffer = await this.readPrefix(path, 4 * 1024 * 1024);
    for (let offset = 4; offset + 32 <= buffer.length; offset += 1) {
      if (buffer.subarray(offset, offset + 4).toString('ascii') !== 'mvhd') continue;
      const version = buffer[offset + 4];
      if (version === 0) {
        const timescale = buffer.readUInt32BE(offset + 16);
        const duration = buffer.readUInt32BE(offset + 20);
        return this.duration(timescale, duration);
      }
      if (version === 1 && offset + 40 <= buffer.length) {
        const timescale = buffer.readUInt32BE(offset + 28);
        const duration = Number(buffer.readBigUInt64BE(offset + 32));
        return this.duration(timescale, duration);
      }
    }
    // WebM and malformed MP4 remain safely streamable, but cannot be completed until trusted metadata exists.
    return null;
  }

  private async pdfPageCount(path: string): Promise<number | null> {
    const buffer = await this.readPrefix(path, 25 * 1024 * 1024);
    const matches = buffer.toString('latin1').match(/\/Type\s*\/Page(?!s)\b/g);
    return matches && matches.length > 0 && matches.length <= 100_000 ? matches.length : null;
  }

  private duration(timescale: number, duration: number): number | null {
    if (
      !Number.isSafeInteger(timescale) ||
      !Number.isSafeInteger(duration) ||
      timescale <= 0 ||
      duration <= 0
    )
      return null;
    const milliseconds = Math.floor((duration * 1_000) / timescale);
    return Number.isSafeInteger(milliseconds) &&
      milliseconds > 0 &&
      milliseconds <= 24 * 60 * 60 * 1_000
      ? milliseconds
      : null;
  }

  private async readPrefix(path: string, maximum: number): Promise<Buffer> {
    const handle = await open(path, 'r');
    try {
      const buffer = Buffer.alloc(maximum);
      const { bytesRead } = await handle.read(buffer, 0, maximum, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }
}
