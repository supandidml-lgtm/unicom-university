import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { MaterialSourceLocatorType } from '@unicom/database';

type TranscriptChunk = {
  content: string;
  locatorType: MaterialSourceLocatorType;
  locator: Record<string, unknown>;
};

/**
 * The only media boundary in AI authoring. It has no browser input, uses fixed
 * ffmpeg arguments, and returns timestamped text only. It intentionally does
 * not log media bytes, provider bodies, or credentials.
 */
@Injectable()
export class VideoTranscriptionService {
  private readonly environment = loadApiEnvironment();

  async transcribe(video: Buffer): Promise<TranscriptChunk[]> {
    if (this.environment.AI_PROVIDER === 'disabled') throw new Error('UNSUPPORTED_SOURCE');
    if (this.environment.AI_PROVIDER === 'test_fake') return this.fixtureTranscript();

    const directory = await mkdtemp(join(tmpdir(), 'unicom-ai-transcription-'));
    const input = join(directory, 'source-video');
    const output = join(directory, 'audio.wav');
    try {
      await writeFile(input, video, { mode: 0o600 });
      await this.extractAudio(input, output);
      const audio = await readFile(output);
      const form = new FormData();
      form.append('model', this.environment.AI_MODEL);
      form.append('response_format', 'verbose_json');
      form.append('file', new Blob([audio], { type: 'audio/wav' }), 'audio.wav');
      const response = await fetch(`${this.environment.AI_BASE_URL}/audio/transcriptions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.environment.AI_API_KEY}` },
        body: form,
      });
      if (!response.ok)
        throw new ServiceUnavailableException('Transcription provider is unavailable.');
      const payload = (await response.json()) as { segments?: unknown };
      const chunks = Array.isArray(payload.segments)
        ? payload.segments
            .map((segment) => this.segment(segment))
            .filter((segment): segment is TranscriptChunk => segment !== null)
        : [];
      if (chunks.length === 0) throw new Error('UNSUPPORTED_SOURCE');
      return chunks;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private fixtureTranscript(): TranscriptChunk[] {
    return [
      {
        content: 'Deterministic test transcript segment.',
        locatorType: MaterialSourceLocatorType.VIDEO_TIMESTAMP,
        locator: { startMs: 0, endMs: 10_000 },
      },
    ];
  }

  private segment(value: unknown): TranscriptChunk | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const segment = value as Record<string, unknown>;
    const text =
      typeof segment['text'] === 'string' ? segment['text'].replace(/\s+/g, ' ').trim() : '';
    const start =
      typeof segment['start'] === 'number' ? Math.round(segment['start'] * 1_000) : null;
    const end = typeof segment['end'] === 'number' ? Math.round(segment['end'] * 1_000) : null;
    if (!text || start === null || end === null || start < 0 || end <= start) return null;
    return {
      content: text.slice(0, 8_000),
      locatorType: MaterialSourceLocatorType.VIDEO_TIMESTAMP,
      locator: { startMs: start, endMs: end },
    };
  }

  private extractAudio(input: string, output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        'ffmpeg',
        [
          '-nostdin',
          '-v',
          'error',
          '-i',
          input,
          '-vn',
          '-ac',
          '1',
          '-ar',
          '16000',
          '-t',
          '900',
          output,
        ],
        { shell: false, windowsHide: true },
      );
      const timeout = setTimeout(
        () => child.kill(),
        this.environment.AI_GENERATION_JOB_TIMEOUT_SECONDS * 1_000,
      );
      child.once('error', () => reject(new Error('SOURCE_EXTRACTION_FAILED')));
      child.once('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(new Error('SOURCE_EXTRACTION_FAILED'));
      });
    });
  }
}
