import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { loadApiEnvironment } from '@unicom/config';
import { createReadStream, promises as fs } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';

@Injectable()
export class MaterialStorageService {
  private readonly environment = loadApiEnvironment();
  private readonly root = resolve(process.cwd(), this.environment.MATERIAL_STORAGE_LOCAL_PATH);
  private readonly s3 =
    this.environment.MATERIAL_STORAGE_PROVIDER === 's3'
      ? new S3Client({
          endpoint: this.required(this.environment.MATERIAL_S3_ENDPOINT),
          region: this.environment.MATERIAL_S3_REGION,
          forcePathStyle: true,
          credentials: {
            accessKeyId: this.required(this.environment.MATERIAL_S3_ACCESS_KEY_ID),
            secretAccessKey: this.required(this.environment.MATERIAL_S3_SECRET_ACCESS_KEY),
          },
        })
      : undefined;

  async putFromQuarantine(storageKey: string, temporaryPath: string): Promise<void> {
    this.resolveKey(storageKey);
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.required(this.environment.MATERIAL_S3_BUCKET),
          Key: storageKey,
          Body: createReadStream(temporaryPath),
        }),
        {
          abortSignal: AbortSignal.timeout(
            this.environment.STORAGE_OPERATION_TIMEOUT_SECONDS * 1_000,
          ),
        },
      );
      return;
    }
    const destination = this.resolveKey(storageKey);
    await fs.mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await fs.rename(temporaryPath, destination);
  }

  async putBuffer(storageKey: string, content: Buffer): Promise<void> {
    this.resolveKey(storageKey);
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.required(this.environment.MATERIAL_S3_BUCKET),
          Key: storageKey,
          Body: content,
          ContentType: 'application/pdf',
        }),
        {
          abortSignal: AbortSignal.timeout(
            this.environment.STORAGE_OPERATION_TIMEOUT_SECONDS * 1_000,
          ),
        },
      );
      return;
    }
    const destination = this.resolveKey(storageKey);
    await fs.mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await fs.writeFile(destination, content, { mode: 0o600 });
  }

  async stream(storageKey: string, start?: number, end?: number): Promise<Readable> {
    this.resolveKey(storageKey);
    if (this.s3) {
      const object = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.required(this.environment.MATERIAL_S3_BUCKET),
          Key: storageKey,
          ...(start === undefined ? {} : { Range: `bytes=${start}-${end}` }),
        }),
        {
          abortSignal: AbortSignal.timeout(
            this.environment.STORAGE_OPERATION_TIMEOUT_SECONDS * 1_000,
          ),
        },
      );
      if (!object.Body || typeof (object.Body as Readable).pipe !== 'function')
        throw new ServiceUnavailableException('Private material object is unavailable.');
      return object.Body as Readable;
    }
    return createReadStream(this.resolveKey(storageKey), { start, end });
  }

  async remove(storageKey: string): Promise<void> {
    this.resolveKey(storageKey);
    if (this.s3) {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.required(this.environment.MATERIAL_S3_BUCKET),
          Key: storageKey,
        }),
        {
          abortSignal: AbortSignal.timeout(
            this.environment.STORAGE_OPERATION_TIMEOUT_SECONDS * 1_000,
          ),
        },
      );
      return;
    }
    await fs.rm(this.resolveKey(storageKey), { force: true });
  }

  private resolveKey(storageKey: string): string {
    if (!/^(materials|certificates)\/[0-9a-f-]{36}$/.test(storageKey))
      throw new ServiceUnavailableException('Invalid private storage key.');
    const target = resolve(this.root, storageKey);
    if (!target.startsWith(`${this.root}${sep}`))
      throw new ServiceUnavailableException('Invalid private storage path.');
    return target;
  }
  private required(value: string | undefined): string {
    if (!value)
      throw new ServiceUnavailableException('Configured S3 material storage is incomplete.');
    return value;
  }
}
