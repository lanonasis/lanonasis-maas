/**
 * User-Agent utilities for IDE extensions
 * Standardized User-Agent header generation across all IDE extensions
 *
 * @module userAgent
 */

/**
 * Generate a standardized User-Agent header string for IDE extensions
 *
 * Format: `<IDE> LanOnasis-Memory/<extension-version> (<platform>; <architecture>)`
 *
 * @param ideName - Name of the IDE (e.g., 'VSCode', 'Cursor', 'Windsurf')
 * @param extensionVersion - Version of the extension (e.g., '1.4.5')
 * @param platform - Optional platform string (defaults to process.platform)
 * @param architecture - Optional architecture string (defaults to process.arch)
 * @returns Standardized User-Agent header string
 *
 * @example
 * ```typescript
 * const userAgent = generateUserAgent('Cursor', '1.4.5');
 * // Returns: 'Cursor LanOnasis-Memory/1.4.5 (darwin; x64)'
 * ```
 */
export function generateUserAgent(
  ideName: string,
  extensionVersion: string,
  platform: string = typeof process !== 'undefined' ? process.platform : 'unknown',
  architecture: string = typeof process !== 'undefined' ? process.arch : 'unknown'
): string {
  // Normalize IDE name: capitalize first letter, remove version suffixes
  const normalizedIde = ideName
    .replace(/[\s\-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .split(' ')[0];

  // Ensure extension version is clean
  const cleanVersion = extensionVersion.replace(/\s+/g, '');

  // Build standardized User-Agent string
  return `${normalizedIde} LanOnasis-Memory/${cleanVersion} (${platform}; ${architecture})`;
}

/**
 * Predefined IDE names for consistency
 */
export const IDE_NAMES = {
  VSCODE: 'VSCode',
  CURSOR: 'Cursor',
  WINDSURF: 'Windsurf',
} as const;

/**
 * Detect the current platform (browser-safe)
 *
 * @returns Platform string (darwin, win32, linux, unknown)
 */
export function detectPlatform(): string {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform;
  }
  if (typeof navigator !== 'undefined' && navigator.platform) {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) return 'darwin';
    if (platform.includes('win')) return 'win32';
    if (platform.includes('linux')) return 'linux';
  }
  return 'unknown';
}

/**
 * Detect the current architecture (browser-safe)
 *
 * @returns Architecture string (x64, arm64, unknown)
 */
export function detectArchitecture(): string {
  if (typeof process !== 'undefined' && process.arch) {
    return process.arch;
  }
  // Browser environment - limited detection
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (/\barm\b/i.test(ua) || /\baarch64\b/i.test(ua)) return 'arm64';
    if (/\bx86_64\b/i.test(ua) || /\bwow64\b/i.test(ua) || /\bwin64\b/i.test(ua)) return 'x64';
  }
  return 'unknown';
}