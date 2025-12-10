import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Global mocks
global.fetch = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});