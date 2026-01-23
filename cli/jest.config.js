export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map @lanonasis/security-sdk subpath exports for Jest
    '^@lanonasis/security-sdk/hash-utils$': '<rootDir>/node_modules/@lanonasis/security-sdk/dist/hash-utils.js'
  },
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/index-simple.ts',
    '!src/mcp-server.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 25,
      lines: 25,
      statements: 25
    }
  },
  testTimeout: 30000,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|inquirer|ora|cli-progress|cli-table3)/)'
  ],
  // Mock console methods to reduce noise in tests
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
