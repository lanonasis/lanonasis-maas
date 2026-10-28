import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// CLIConfig writes to os.homedir()/.maas, and several suites build a CLIConfig
// without a temp dir, so running the suite on a real machine replaced the
// developer's CLI login (2026-10-28). This file runs in the parent process
// before the workers start, so they inherit a throwaway HOME (a setup file is
// too late: jest sandboxes process.env per test file, and os.homedir() reads
// the real environment). LANONASIS_TEST_REAL_HOME=1 opts back in for the
// credential-based e2e suite.
if (process.env.LANONASIS_TEST_REAL_HOME !== '1') {
  const home = mkdtempSync(join(tmpdir(), 'lanonasis-cli-test-home-'));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
}

export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map @lanonasis/security-sdk subpath exports for Jest
    '^@lanonasis/security-sdk/hash-utils$':
      '<rootDir>/node_modules/@lanonasis/security-sdk/dist/hash-utils.js',
    '^@lanonasis/oauth-client$': '<rootDir>/src/__tests__/mocks/oauth-client.ts',
  },
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/test/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/index-simple.ts',
    '!src/mcp-server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 25,
      statements: 25,
    },
  },
  testTimeout: 30000,
  transform: {
    '^.+\\.ts$': [
        'ts-jest',
        {
          useESM: true,
          tsconfig: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(chalk|inquirer|ora|cli-progress|cli-table3)/)'],
  // Mock console methods to reduce noise in tests
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
