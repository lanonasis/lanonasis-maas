import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock VS Code API
declare const acquireVsCodeApi: any;
global.acquireVsCodeApi = vi.fn(() => ({
  postMessage: vi.fn(),
  getState: vi.fn(),
  setState: vi.fn()
}));

// Global mocks
global.fetch = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});