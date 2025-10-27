import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

describe('LanOnasis CLI package', () => {
  it('has a valid package name', () => {
    expect(packageJson.name).toBe('@lanonasis/cli');
  });

  it('has a non-empty version string', () => {
    expect(typeof packageJson.version).toBe('string');
    expect(packageJson.version.length).toBeGreaterThan(0);
  });

  it('exposes command binaries', () => {
    expect(packageJson.bin).toBeDefined();
    expect(Object.keys(packageJson.bin || {})).toContain('lanonasis');
  });
});
