import { jest, beforeAll, afterAll, afterEach } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.CLI_VERBOSE = 'false';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(30000);

// Mock process.exit to prevent tests from actually exiting
const mockExit = jest.fn();
process.exit = mockExit as any;

afterEach(() => {
  // Clear mock calls after each test
  mockExit.mockClear();
});