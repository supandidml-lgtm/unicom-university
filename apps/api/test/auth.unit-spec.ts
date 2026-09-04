import { describe, expect, it } from 'vitest';
import { loadApiEnvironment } from '@unicom/config';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  tokensMatch,
} from '../src/modules/auth/auth.crypto.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import {
  maskNik,
  normalizeFullName,
  normalizeNik,
  normalizePhoneNumber,
  StaffProfileCrypto,
} from '../src/modules/staff/staff-profile.crypto.js';

describe('authentication primitives', () => {
  it('uses Argon2id hashes and verifies passwords', async () => {
    const passwordService = new PasswordService();
    const hash = await passwordService.hash('secure-password-for-tests');

    expect(hash).toContain('$argon2id$');
    await expect(passwordService.verify(hash, 'secure-password-for-tests')).resolves.toBe(true);
    await expect(passwordService.verify(hash, 'incorrect-password')).resolves.toBe(false);
  });

  it('creates random opaque tokens and only compares their hashes', () => {
    const token = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(token);

    expect(token).toHaveLength(43);
    expect(tokenHash).not.toContain(token);
    expect(tokensMatch(token, tokenHash)).toBe(true);
    expect(tokensMatch(generateOpaqueToken(), tokenHash)).toBe(false);
  });

  it('rejects missing rate-limit secrets during configuration validation', () => {
    const invalidEnvironment = { ...process.env };
    delete invalidEnvironment['AUTH_RATE_LIMIT_SECRET'];

    expect(() => loadApiEnvironment(invalidEnvironment)).toThrow('AUTH_RATE_LIMIT_SECRET');
  });

  it('does not treat the string false as an enabled trusted proxy', () => {
    expect(loadApiEnvironment({ ...process.env, AUTH_TRUST_PROXY: 'false' }).AUTH_TRUST_PROXY).toBe(
      false,
    );
  });

  it('validates, masks, encrypts, and fingerprints NIK without plaintext persistence', () => {
    const nik = normalizeNik('3174 1234 5678 9012');
    const crypto = new StaffProfileCrypto();
    const encryptedOnce = crypto.encryptNik(nik);
    const encryptedTwice = crypto.encryptNik(nik);

    expect(nik).toBe('3174123456789012');
    expect(maskNik(nik.slice(0, 4), nik.slice(-4))).toBe('3174********9012');
    expect(encryptedOnce).not.toContain(nik);
    expect(encryptedOnce).not.toBe(encryptedTwice);
    expect(crypto.decryptNik(encryptedOnce)).toBe(nik);
    expect(crypto.fingerprintNik(nik)).toBe(crypto.fingerprintNik(nik));
    expect(crypto.fingerprintNik(nik)).not.toBe(crypto.fingerprintNik('3174123456789013'));
    expect(() => normalizeNik('317412345678901')).toThrow('exactly 16');
    expect(() => normalizeNik('31741234567890123')).toThrow('exactly 16');
    expect(() => crypto.decryptNik(`${encryptedOnce}x`)).toThrow('cannot be decrypted');
  });

  it('normalizes Unicode names and Indonesian phone display input', () => {
    expect(normalizeFullName('  Siti Nur Áulia  ')).toBe('Siti Nur Áulia');
    expect(() => normalizeFullName('   ')).toThrow('2 to 150');
    expect(normalizePhoneNumber('0812-3456-7890')).toBe('+6281234567890');
    expect(normalizePhoneNumber('+62 (812) 3456 7890')).toBe('+6281234567890');
    expect(() => normalizePhoneNumber('abc')).toThrow('invalid');
  });
});
