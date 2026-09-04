import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { loadApiEnvironment } from '@unicom/config';

const encryptionAlgorithm = 'aes-256-gcm';
const envelopeVersion = 'v1';
const nikPattern = /^\d{16}$/;

export function normalizeNik(value: unknown): string {
  const normalized = typeof value === 'string' ? value.replace(/\s/g, '') : '';
  if (!nikPattern.test(normalized)) {
    throw new Error('NIK must contain exactly 16 decimal digits.');
  }
  return normalized;
}

export function normalizeFullName(value: unknown): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length < 2 || normalized.length > 150) {
    throw new Error('Full name must contain 2 to 150 characters.');
  }
  return normalized;
}

export function normalizePhoneNumber(value: unknown): string {
  let normalized = typeof value === 'string' ? value.trim().replace(/[\s().-]/g, '') : '';
  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  } else if (normalized.startsWith('62')) {
    normalized = `+${normalized}`;
  } else if (normalized.startsWith('0')) {
    normalized = `+62${normalized.slice(1)}`;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Phone number is invalid.');
  }
  return normalized;
}

export function maskNik(nikFirst4: string, nikLast4: string): string {
  return `${nikFirst4}********${nikLast4}`;
}

export class StaffProfileCrypto {
  private readonly encryptionKey: Buffer;
  private readonly hmacKey: Buffer;

  constructor(environment = loadApiEnvironment()) {
    this.encryptionKey = Buffer.from(environment.PROFILE_PII_ENCRYPTION_KEY, 'base64');
    this.hmacKey = Buffer.from(environment.PROFILE_NIK_HMAC_KEY, 'base64');
  }

  encryptNik(nik: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(encryptionAlgorithm, this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(nik, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      envelopeVersion,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decryptNik(envelope: string): string {
    const [version, encodedIv, encodedTag, encodedCiphertext, extra] = envelope.split('.');
    if (
      version !== envelopeVersion ||
      !encodedIv ||
      !encodedTag ||
      !encodedCiphertext ||
      extra !== undefined
    ) {
      throw new Error('Invalid encrypted NIK envelope.');
    }
    try {
      const decipher = createDecipheriv(
        encryptionAlgorithm,
        this.encryptionKey,
        Buffer.from(encodedIv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new Error('Encrypted NIK cannot be decrypted.');
    }
  }

  fingerprintNik(nik: string): string {
    return createHmac('sha256', this.hmacKey).update(nik, 'utf8').digest('hex');
  }
}
