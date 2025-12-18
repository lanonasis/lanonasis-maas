// Mock data for development/testing
// In production, this will be replaced by real data from PrototypeUIBridge

import type { Memory } from './types';

export const MOCK_MEMORIES: Memory[] = [];

export const MOCK_API_KEYS = [
  {
    id: '1',
    name: 'Development Key',
    scope: 'read,write',
    lastUsed: '2 hours ago',
  },
  {
    id: '2',
    name: 'CI/CD Pipeline',
    scope: 'read',
    lastUsed: '1 day ago',
  },
];

