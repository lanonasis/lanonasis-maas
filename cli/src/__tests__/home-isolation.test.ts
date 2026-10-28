import { describe, it, expect } from '@jest/globals';
import * as os from 'os';
import * as path from 'path';
import { CLIConfig } from '../utils/config.js';

// Regression (2026-10-28): the suite wrote the developer's real ~/.maas and
// replaced their CLI login. Every test file must see a throwaway HOME.
describe('test HOME isolation', () => {
  it('gives each test file a throwaway HOME, so CLIConfig never targets the real ~/.maas', () => {
    expect(path.basename(os.homedir())).toMatch(/^lanonasis-cli-test-home-/);
    expect((new CLIConfig() as unknown as { configPath: string }).configPath.startsWith(os.tmpdir())).toBe(true);
  });
});
