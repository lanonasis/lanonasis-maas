import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  rootDir: '.',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@mcp-core/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/../..//src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: '<rootDir>/tsconfig.test.json'
    }]
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: '<rootDir>/coverage',
  verbose: false
};

export default config;
