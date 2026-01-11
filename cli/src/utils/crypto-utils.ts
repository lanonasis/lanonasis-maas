/**
 * Cryptographic utilities for secure credential storage
 *
 * Security Model:
 * - API Keys: Hashed with SHA-256 (one-way, server compares hashes)
 * - Vendor Keys: Encrypted with AES-256-GCM (reversible, needed for API headers)
 * - Encryption key derived from machine-specific identifier + user password (optional)
 */

import crypto from 'crypto';
import { homedir, platform, hostname } from 'os';
import { hashApiKey, isSha256Hash } from '@lanonasis/security-sdk/hash-utils';

// Encryption algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Default salt component for key derivation when no passphrase is provided
// This is a known constant, not a secret - it's part of the encryption scheme
const DEFAULT_SALT_COMPONENT = 'lanonasis-cli-default-salt';

/**
 * Get a machine-specific identifier for key derivation
 * Uses hostname + platform + homedir to create a stable machine fingerprint
 */
function getMachineId(): string {
  const machineFingerprint = `${hostname()}-${platform()}-${homedir()}`;
  return crypto
    .createHash('sha256')
    .update(machineFingerprint)
    .digest('hex');
}

/**
 * Derive an encryption key from machine ID and optional user passphrase
 * Uses PBKDF2 with 100,000 iterations
 */
function deriveEncryptionKey(salt: Buffer, passphrase?: string): Buffer {
  const baseSecret = getMachineId() + (passphrase || DEFAULT_SALT_COMPONENT);
  return crypto.pbkdf2Sync(baseSecret, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encrypted: string; // Base64-encoded ciphertext
  iv: string; // Base64-encoded initialization vector
  authTag: string; // Base64-encoded authentication tag
  salt: string; // Base64-encoded salt for key derivation
  version: string; // Encryption version for future migration
}

/**
 * Encrypt sensitive data (like vendor keys)
 *
 * @param data - The sensitive data to encrypt
 * @param passphrase - Optional user passphrase for additional security
 * @returns Encrypted data structure
 */
export function encryptCredential(data: string, passphrase?: string): EncryptedData {
  if (!data || typeof data !== 'string') {
    throw new Error('Data must be a non-empty string');
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive encryption key
  const key = deriveEncryptionKey(salt, passphrase);

  // Create cipher and encrypt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
    version: '1.0'
  };
}

/**
 * Decrypt sensitive data
 *
 * @param encryptedData - The encrypted data structure
 * @param passphrase - Optional user passphrase (must match encryption)
 * @returns Decrypted data
 */
export function decryptCredential(encryptedData: EncryptedData, passphrase?: string): string {
  if (!encryptedData || typeof encryptedData !== 'object') {
    throw new Error('Encrypted data must be an object');
  }

  try {
    // Parse encrypted data components
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Derive the same encryption key
    const key = deriveEncryptionKey(salt, passphrase);

    // Create decipher and decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed - credential may be corrupted or wrong passphrase');
  }
}

/**
 * Secure vendor key storage wrapper
 */
export interface SecureVendorKey {
  // For lookup/validation (one-way hash)
  keyHash: string;
  // For API requests (encrypted, reversible)
  encryptedKey: EncryptedData;
  // Metadata
  createdAt: string;
  lastUsed?: string;
  encrypted: true; // Flag to indicate this uses encryption
}

/**
 * Securely store a vendor key
 *
 * @param vendorKey - The raw vendor key
 * @param passphrase - Optional user passphrase for additional security
 * @returns Secure storage structure
 */
export function secureStoreVendorKey(vendorKey: string, passphrase?: string): SecureVendorKey {
  if (!vendorKey || typeof vendorKey !== 'string') {
    throw new Error('Vendor key must be a non-empty string');
  }

  return {
    keyHash: hashApiKey(vendorKey),
    encryptedKey: encryptCredential(vendorKey, passphrase),
    createdAt: new Date().toISOString(),
    encrypted: true
  };
}

/**
 * Retrieve a vendor key from secure storage
 *
 * @param secureKey - The secure storage structure
 * @param passphrase - Optional user passphrase (must match storage)
 * @returns Decrypted vendor key
 */
export function retrieveVendorKey(secureKey: SecureVendorKey, passphrase?: string): string {
  if (!secureKey || !secureKey.encryptedKey) {
    throw new Error('Invalid secure key structure');
  }

  return decryptCredential(secureKey.encryptedKey, passphrase);
}

/**
 * Validate a vendor key against stored hash
 *
 * @param vendorKey - The key to validate
 * @param storedHash - The stored hash to compare against
 * @returns True if key matches hash
 */
export function validateVendorKeyHash(vendorKey: string, storedHash: string): boolean {
  if (!vendorKey || !storedHash) {
    return false;
  }

  try {
    const keyHash = hashApiKey(vendorKey);
    return keyHash === storedHash;
  } catch {
    return false;
  }
}

/**
 * Check if a value is encrypted vendor key data
 */
export function isEncryptedVendorKey(value: any): value is SecureVendorKey {
  return (
    value &&
    typeof value === 'object' &&
    value.encrypted === true &&
    typeof value.keyHash === 'string' &&
    isSha256Hash(value.keyHash) &&
    value.encryptedKey &&
    typeof value.encryptedKey.encrypted === 'string'
  );
}

/**
 * Migration helper: Check if vendor key needs encryption upgrade
 */
export function needsEncryptionMigration(vendorKey: any): boolean {
  // If it's a plain string, it's not encrypted
  if (typeof vendorKey === 'string' && !isSha256Hash(vendorKey)) {
    return true;
  }
  // If it's not an encrypted structure, needs migration
  return !isEncryptedVendorKey(vendorKey);
}
