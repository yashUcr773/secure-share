// Encryption utilities for SecureShare
// Uses Web Crypto API for client-side encryption

export class CryptoService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Generate a random encryption key
   */
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  static async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive actual encryption key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a random salt
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  /**
   * Generate a random IV
   */
  static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
  }

  /**
   * Encrypt text content
   */
  static async encryptText(text: string, key: CryptoKey): Promise<{
    encryptedData: ArrayBuffer;
    iv: Uint8Array;
  }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const iv = this.generateIV();

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    return { encryptedData, iv };
  }

  /**
   * Decrypt text content
   */
  static async decryptText(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<string> {
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  /**
   * Export key to raw format for storage
   */
  static async exportKey(key: CryptoKey): Promise<ArrayBuffer> {
    return await crypto.subtle.exportKey('raw', key);
  }

  /**
   * Import key from raw format
   */
  static async importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.ALGORITHM },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  static arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate a shareable link ID
   */
  static generateShareId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * High-level encryption wrapper
 */
export class FileEncryption {
  /**
   * Encrypt file content with password
   */
  static async encryptWithPassword(content: string, password: string): Promise<{
    encryptedContent: string;
    salt: string;
    iv: string;
    shareId: string;
  }> {
    const salt = CryptoService.generateSalt();
    const key = await CryptoService.deriveKeyFromPassword(password, salt);
    const { encryptedData, iv } = await CryptoService.encryptText(content, key);
    
    return {
      encryptedContent: CryptoService.arrayBufferToBase64(encryptedData),
      salt: CryptoService.arrayBufferToBase64(salt.buffer),
      iv: CryptoService.arrayBufferToBase64(iv.buffer),
      shareId: CryptoService.generateShareId(),
    };
  }

  /**
   * Encrypt file content with random key
   */
  static async encryptWithRandomKey(content: string): Promise<{
    encryptedContent: string;
    key: string;
    iv: string;
    shareId: string;
  }> {
    const key = await CryptoService.generateKey();
    const { encryptedData, iv } = await CryptoService.encryptText(content, key);
    const exportedKey = await CryptoService.exportKey(key);
    
    return {
      encryptedContent: CryptoService.arrayBufferToBase64(encryptedData),
      key: CryptoService.arrayBufferToBase64(exportedKey),
      iv: CryptoService.arrayBufferToBase64(iv.buffer),
      shareId: CryptoService.generateShareId(),
    };
  }

  /**
   * Decrypt file content with password
   */
  static async decryptWithPassword(
    encryptedContent: string,
    password: string,
    salt: string,
    iv: string
  ): Promise<string> {
    const saltBuffer = new Uint8Array(CryptoService.base64ToArrayBuffer(salt));
    const ivBuffer = new Uint8Array(CryptoService.base64ToArrayBuffer(iv));
    const encryptedBuffer = CryptoService.base64ToArrayBuffer(encryptedContent);
    
    const key = await CryptoService.deriveKeyFromPassword(password, saltBuffer);
    return await CryptoService.decryptText(encryptedBuffer, key, ivBuffer);
  }

  /**
   * Decrypt file content with key
   */
  static async decryptWithKey(
    encryptedContent: string,
    keyData: string,
    iv: string
  ): Promise<string> {
    const keyBuffer = CryptoService.base64ToArrayBuffer(keyData);
    const ivBuffer = new Uint8Array(CryptoService.base64ToArrayBuffer(iv));
    const encryptedBuffer = CryptoService.base64ToArrayBuffer(encryptedContent);
    
    const key = await CryptoService.importKey(keyBuffer);
    return await CryptoService.decryptText(encryptedBuffer, key, ivBuffer);
  }
}
