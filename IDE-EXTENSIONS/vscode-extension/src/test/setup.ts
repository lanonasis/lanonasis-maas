import * as matchers from '@testing-library/jest-dom/matchers';
import { afterEach, vi, expect as vitestExpect } from 'vitest';
import { cleanup } from '@testing-library/react';

const globalExpect = globalThis.expect ?? vitestExpect;
globalExpect.extend(matchers);
globalThis.expect = globalExpect;

// Mock VS Code API - exported so tests can access and reset it
export const mockVSCode = {
  postMessage: vi.fn(),
  setState: vi.fn(),
};

// Mock window.vscode - configurable allows tests to redefine if needed
Object.defineProperty(window, 'vscode', {
  value: mockVSCode,
  writable: true,
  configurable: true,
});

// Enhance MessageEvent if needed (jsdom provides a basic one, but we ensure it has data)
global.MessageEvent = class EnhancedMessageEvent extends Event {
  data: unknown;
  constructor(type: string, eventInitDict?: MessageEventInit) {
    super(type, eventInitDict);
    this.data = eventInitDict?.data;
  }
} as unknown as typeof MessageEvent;

// Note: We do NOT mock addEventListener/removeEventListener
// jsdom provides real implementations that work with dispatchEvent

afterEach(() => {
  cleanup();
});

import type { Memory } from '../shared/types';
import { Lightbulb } from 'lucide-react';

// Test utilities with proper types
export const createMockMemory = (overrides: Partial<Memory> = {}): Memory => ({
  id: 'test-memory-1',
  title: 'Test Memory',
  content: 'Test content',
  type: 'context',
  date: new Date('2024-01-15T10:30:00Z'), // Date object, not string
  tags: ['test', 'mock'],
  icon: Lightbulb,
  ...overrides,
});

export const createMockVSCodeMessage = (type: string, data?: unknown) => ({
  data: { type, data }
});

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
