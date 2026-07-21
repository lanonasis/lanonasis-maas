// Root jest.config.cjs — TestSprite Pre-Check discovery entry point
// 
// TestSprite's GitHub App Pre-Check scans the repo root for test config
// files. This config makes the CLI test files discoverable, resolving
// the "No tests detected" error on PRs touching CLI/prescan code.
//
// Actual test execution should use `bun run test:cli` (delegates to 
// cli/jest.config.js), which handles ESM/TypeScript transforms correctly.

module.exports = {
  testMatch: [
    '<rootDir>/cli/src/**/__tests__/**/*.test.ts',
    '<rootDir>/cli/src/**/*.test.ts',
    '<rootDir>/cli/tests/**/*.test.js',
    '<rootDir>/cli/test/**/*.test.ts',
  ],
  passWithNoTests: true,
  testEnvironment: 'node',
  testTimeout: 30000,
};
