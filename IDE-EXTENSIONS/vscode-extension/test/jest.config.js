module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
  },
  testMatch: ['**/unit/**/*.test.{ts,tsx}', '**/integration/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    '../src/**/*.{ts,tsx}',
    '!../src/**/*.stories.tsx',
    '!../src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },
};