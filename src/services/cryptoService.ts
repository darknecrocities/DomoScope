/**
 * Client-Side Web Crypto Subtle AES-256-GCM Encryption Service
 *
 * Provides cryptographic protection for sensitive credentials (GitHub tokens,
 * AI API keys) at rest in browser storage (IndexedDB) with zero external dependencies.
 */

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class CryptoService {
  private static readonly PREFIX = 'enc:v1:';

  private static getCrypto(): Crypto {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      return globalThis.crypto;
    }
    if (typeof window !== 'undefined' && window.crypto) {
      return window.crypto;
    }
    throw new Error('Web Crypto API is not supported in this runtime environment.');
  }

  private static async getDerivedKey(salt: Uint8Array): Promise<CryptoKey> {
    const cryptoInstance = this.getCrypto();
    // Unique device-bound material derived from origin and user agent
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'domoscope-local';
    const ua = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'domoscope-agent';
    const baseEntropy = `domoscope-secure-vault:${origin}:${ua}`;

    const enc = new TextEncoder();
    const keyMaterial = await cryptoInstance.subtle.importKey(
      'raw',
      enc.encode(baseEntropy),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return cryptoInstance.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 100_000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * If already encrypted or empty, handles safely.
   */
  static async encrypt(plainText: string): Promise<string> {
    if (!plainText || plainText.trim() === '') return '';
    if (this.isEncrypted(plainText)) return plainText;

    const cryptoInstance = this.getCrypto();
    const salt = cryptoInstance.getRandomValues(new Uint8Array(16));
    const iv = cryptoInstance.getRandomValues(new Uint8Array(12));
    const key = await this.getDerivedKey(salt);

    const enc = new TextEncoder();
    const encryptedBuffer = await cryptoInstance.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );

    const ciphertextBase64 = uint8ToBase64(new Uint8Array(encryptedBuffer));
    const saltBase64 = uint8ToBase64(salt);
    const ivBase64 = uint8ToBase64(iv);

    return `${this.PREFIX}${saltBase64}:${ivBase64}:${ciphertextBase64}`;
  }

  /**
   * Decrypts ciphertext.
   * If the string does not have the enc:v1: prefix, returns it as-is for backward compatibility.
   */
  static async decrypt(cipherText: string): Promise<string> {
    if (!cipherText || cipherText.trim() === '') return '';
    if (!this.isEncrypted(cipherText)) {
      // Legacy plaintext token, return directly
      return cipherText;
    }

    try {
      const payload = cipherText.slice(this.PREFIX.length);
      const [saltBase64, ivBase64, dataBase64] = payload.split(':');

      if (!saltBase64 || !ivBase64 || !dataBase64) {
        throw new Error('Malformed encrypted payload format.');
      }

      const salt = base64ToUint8(saltBase64);
      const iv = base64ToUint8(ivBase64);
      const data = base64ToUint8(dataBase64);

      const key = await this.getDerivedKey(salt);
      const cryptoInstance = this.getCrypto();

      const decryptedBuffer = await cryptoInstance.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        data as BufferSource
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch {
      // Return empty string if decryption fails (e.g. tampering or origin change)
      return '';
    }
  }

  /**
   * Checks whether a given string is encrypted with enc:v1:
   */
  static isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(this.PREFIX);
  }

  /**
   * Masks a sensitive token for display, showing only prefix and the last 4 characters.
   */
  static maskToken(token: string): string {
    if (!token) return '';
    const clean = token.trim();
    if (clean.length < 8) return '••••••••';
    const prefixMatch = clean.match(/^(gh[pousr]_|github_pat_)/);
    const prefix = prefixMatch ? prefixMatch[1] : '';
    const suffix = clean.slice(-4);
    return `${prefix}••••••••••••••••••••${suffix}`;
  }

  /**
   * Sanitizes error messages to prevent accidental token exposure in logs or UI alerts.
   */
  static sanitizeError(message: string): string {
    if (!message) return '';
    return message
      .replace(/gh[pousr]_[A-Za-z0-9_]{16,255}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/github_pat_[A-Za-z0-9_]{20,255}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/token\s+[A-Za-z0-9_.-]+/gi, 'token [REDACTED_TOKEN]');
  }
}
