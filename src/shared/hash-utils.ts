/**
 * Shared Hashing Utilities (source of truth)
 * Ensures consistent SHA-256 hashing across server, dashboard, and SDK layers.
 */

import crypto from 'crypto';

export function isSha256Hash(value: string): boolean {
    return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
}

export function hashApiKey(apiKey: string): string {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('API key must be a non-empty string');
    }

    return crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');
}

export async function hashApiKeyBrowser(apiKey: string): Promise<string> {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('API key must be a non-empty string');
    }

    const subtle = globalThis.crypto?.subtle ?? crypto.webcrypto?.subtle;
    if (!subtle) {
        return hashApiKey(apiKey);
    }

    const data = new TextEncoder().encode(apiKey);
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function ensureApiKeyHash(apiKey: string): string {
    if (isSha256Hash(apiKey)) {
        return apiKey.toLowerCase();
    }
    return hashApiKey(apiKey);
}

export async function ensureApiKeyHashBrowser(apiKey: string): Promise<string> {
    if (isSha256Hash(apiKey)) {
        return apiKey.toLowerCase();
    }
    return hashApiKeyBrowser(apiKey);
}

export function verifyApiKey(apiKey: string, storedHash: string): boolean {
    const computedHash = hashApiKey(apiKey);

    if (computedHash.length !== storedHash.length) {
        return false;
    }

    const computedBuffer = Buffer.from(computedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');

    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}

export function generateApiKey(): string {
    const randomBytes = crypto.randomBytes(36);
    const randomString = randomBytes.toString('base64url');
    return `lns_${randomString}`;
}

export type ApiKeyHash = string;
export type ApiKey = string;
