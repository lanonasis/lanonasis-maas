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

  it('documents concierge REPL endpoint options on the bridge command', () => {
    const cliSource = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf-8');
    const replCommand = cliSource.slice(
      cliSource.indexOf(".command('repl')"),
      cliSource.indexOf('// Topic commands')
    );

    expect(replCommand).toContain(".option('--ai-router <url>'");
    expect(replCommand).toContain(".option('--model <model>'");
    expect(replCommand).toContain(".option('--config <path>'");
    expect(replCommand).toContain("args.push('--ai-router', options.aiRouter)");
    expect(replCommand).toContain("args.push('--model', options.model)");
    expect(replCommand).toContain("args.push('--config', options.config)");
  });
});
