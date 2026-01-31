import { jest, beforeAll, afterAll, afterEach } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.CLI_VERBOSE = 'false';

// Configure test credentials for E2E tests only when explicitly provided

// Configure service endpoints for production testing
if (!process.env.AUTH_BASE) {
  process.env.AUTH_BASE = 'https://auth.lanonasis.com';
}
if (!process.env.MEMORY_BASE) {
  process.env.MEMORY_BASE = 'https://api.lanonasis.com/api/v1';
}
if (!process.env.MCP_BASE) {
  process.env.MCP_BASE = 'https://mcp.lanonasis.com/api/v1';
}
if (!process.env.MCP_WS_BASE) {
  process.env.MCP_WS_BASE = 'wss://mcp.lanonasis.com/ws';
}
if (!process.env.MCP_SSE_BASE) {
  process.env.MCP_SSE_BASE = 'https://mcp.lanonasis.com/api/v1/events';
}

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
