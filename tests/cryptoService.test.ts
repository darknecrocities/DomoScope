import { describe, it, expect } from 'vitest';
import { CryptoService } from '../src/services/cryptoService';

describe('CryptoService (Web Crypto Subtle AES-256-GCM)', () => {
  it('encrypts and decrypts a sensitive token correctly', async () => {
    const rawToken = 'ghp_superSecretToken1234567890abcdefghijklmn';
    const encrypted = await CryptoService.encrypt(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(CryptoService.isEncrypted(encrypted)).toBe(true);

    const decrypted = await CryptoService.decrypt(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it('produces unique ciphertexts for identical inputs due to random IV & salt', async () => {
    const token = 'ghp_duplicateSampleToken9876543210';
    const enc1 = await CryptoService.encrypt(token);
    const enc2 = await CryptoService.encrypt(token);

    expect(enc1).not.toBe(enc2);

    const dec1 = await CryptoService.decrypt(enc1);
    const dec2 = await CryptoService.decrypt(enc2);

    expect(dec1).toBe(token);
    expect(dec2).toBe(token);
  });

  it('seamlessly supports legacy unencrypted tokens (backward compatibility)', async () => {
    const legacyPlainToken = 'ghp_legacyPlaintextTokenExample';
    expect(CryptoService.isEncrypted(legacyPlainToken)).toBe(false);

    const decrypted = await CryptoService.decrypt(legacyPlainToken);
    expect(decrypted).toBe(legacyPlainToken);
  });

  it('correctly masks tokens to prevent shoulder surfing in UI', () => {
    const token = 'ghp_1234567890abcdef1234567890abcdef1234';
    const masked = CryptoService.maskToken(token);
    expect(masked.startsWith('ghp_••••')).toBe(true);
    expect(masked.endsWith('1234')).toBe(true);
  });

  it('sanitizes error messages removing sensitive tokens', () => {
    const rawError = 'Failed to fetch repo with Authorization: token ghp_sensitiveSecretTokenHere4567890';
    const sanitized = CryptoService.sanitizeError(rawError);

    expect(sanitized).not.toContain('ghp_sensitiveSecretTokenHere4567890');
    expect(sanitized).toContain('[REDACTED_GITHUB_TOKEN]');
  });
});
