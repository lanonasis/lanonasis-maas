import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock VS Code API
const mockVSCode = {
  postMessage: vi.fn(),
  setState: vi.fn(),
};

// Mock window.vscode
Object.defineProperty(window, 'vscode', {
  value: mockVSCode,
  writable: true,
});

// Mock VS Code MessageEvent
global.MessageEvent = class MessageEvent extends Event {
  data: any;
  constructor(type: string, eventInitDict?: { data?: any }) {
    super(type);
    this.data = eventInitDict?.data;
  }
} as any;

// Mock addEventListener/removeEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

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

export const createMockVSCodeMessage = (type: string, data?: any) => ({
  data: { type, data }
});

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
