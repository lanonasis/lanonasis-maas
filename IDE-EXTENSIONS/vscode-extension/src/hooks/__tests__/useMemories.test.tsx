import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { useMemories } from '../useMemories';
import type { Memory } from '../../shared/types';
import { Lightbulb, Terminal } from 'lucide-react';

// Tiny host component that exposes the hook's return value on a module-local
// so the test can assert on it without dragging in @testing-library/user-event.
interface UseMemoriesSnapshot {
  memories: Memory[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMemories: Memory[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
let lastResult: UseMemoriesSnapshot | null = null;
function Probe() {
  lastResult = useMemories();
  return null;
}

// `window.vscode` is injected at runtime by src/test/setup.ts without a
// global Window augmentation, so we cast through `unknown` here rather
// than touch every other consumer of `window`.
type VSCodeMock = { postMessage: ReturnType<typeof vi.fn> };
function getVSCodePostMessageMock(): ReturnType<typeof vi.fn> {
  const w = window as unknown as { vscode?: VSCodeMock };
  if (!w.vscode) {
    throw new Error('window.vscode mock is not installed; verify src/test/setup.ts ran');
  }
  return w.vscode.postMessage;
}

function makeMemory(id: string, title: string): Memory {
  return {
    id,
    title,
    content: `${title} content`,
    type: 'context',
    date: new Date('2024-01-15T10:30:00Z'),
    tags: ['t'],
    icon: id === '1' ? Lightbulb : Terminal,
  };
}

function makeInitialMemories(): Memory[] {
  return [
    makeMemory('1', 'Alpha'),
    makeMemory('2', 'Bravo'),
    makeMemory('3', 'Charlie'),
    makeMemory('4', 'Delta'),
    makeMemory('5', 'Echo'),
  ];
}

function makeInitialProtoPayload(initial: Memory[]): unknown[] {
  return initial.map((m) => ({
    id: m.id,
    title: m.title,
    content: m.content,
    type: m.type,
    date: m.date.toISOString(),
    tags: m.tags,
    iconType: 'lightbulb',
  }));
}

/**
 * Dispatch a message the way the real VS Code host would: a MessageEvent
 * with `data` carrying `{type, data}`. The setup file wires window.vscode +
 * creates a real MessageEvent class that accepts `data`, so dispatchEvent
 * drives the hook's listener end-to-end.
 */
function dispatchMessage(type: string, data: unknown): void {
  const event = new MessageEvent('message', { data: { type, data } });
  window.dispatchEvent(event);
}

async function settleWithMemories(initial: Memory[]): Promise<void> {
  await act(async () => {
    dispatchMessage('memories', makeInitialProtoPayload(initial));
  });
}

function expectHookReady(): UseMemoriesSnapshot {
  if (!lastResult) {
    throw new Error('useMemories hook did not render');
  }
  return lastResult;
}

describe('useMemories — incremental listeners (AC-R1, AC-R4)', () => {
  beforeEach(() => {
    lastResult = null;
    getVSCodePostMessageMock().mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('memoryDeleted removes the entry and does NOT re-request getMemories', async () => {
    // Avoid the 15s initial-load timeout firing mid-test
    vi.useFakeTimers();

    render(<Probe />);

    const initial = makeInitialMemories();
    await settleWithMemories(initial);

    const baselineCalls = getVSCodePostMessageMock().mock.calls.length;

    // Act: incremental delete of id '2'
    await act(async () => {
      dispatchMessage('memoryDeleted', { id: '2' });
    });

    // Assert: length drops to 4 and the right entry is gone
    const hook = expectHookReady();
    expect(hook.memories).toHaveLength(4);
    expect(hook.memories.find((m) => m.id === '2')).toBeUndefined();

    // AC-R1: no re-fetch — postMessage calls must NOT have grown a `getMemories`
    const calls = getVSCodePostMessageMock().mock.calls;
    const newGetMemoriesCalls = calls
      .slice(baselineCalls)
      .filter(([type]) => type === 'getMemories');
    expect(newGetMemoriesCalls).toHaveLength(0);
  });

  test('memoryUpdated replaces the matching entry via prototypeMemoryToMemory', async () => {
    vi.useFakeTimers();

    render(<Probe />);

    const initial = makeInitialMemories();
    await settleWithMemories(initial);

    const baselineCalls = getVSCodePostMessageMock().mock.calls.length;

    const updated = {
      id: '3',
      title: 'Charlie — RENAMED',
      content: 'Updated content',
      type: 'project',
      date: new Date('2024-02-01T08:00:00Z').toISOString(),
      tags: ['edited'],
      iconType: 'terminal',
    };

    await act(async () => {
      dispatchMessage('memoryUpdated', updated);
    });

    const hook = expectHookReady();
    const replaced = hook.memories.find((m) => m.id === '3');
    expect(replaced).toBeDefined();
    if (!replaced) return; // narrow for TS without `!`
    expect(replaced.title).toBe('Charlie — RENAMED');
    expect(replaced.content).toBe('Updated content');
    expect(replaced.type).toBe('project');
    expect(replaced.tags).toEqual(['edited']);
    expect(hook.memories).toHaveLength(5);

    // AC-R1: no re-fetch
    const calls = getVSCodePostMessageMock().mock.calls;
    const newGetMemoriesCalls = calls
      .slice(baselineCalls)
      .filter(([type]) => type === 'getMemories');
    expect(newGetMemoriesCalls).toHaveLength(0);
  });

  test('updateMemoryFailed surfaces the message via error; memories list untouched', async () => {
    vi.useFakeTimers();

    render(<Probe />);

    const initial = makeInitialMemories();
    await settleWithMemories(initial);

    expect(expectHookReady().error).toBeNull();
    const baselineCalls = getVSCodePostMessageMock().mock.calls.length;

    await act(async () => {
      dispatchMessage('updateMemoryFailed', {
        id: '3',
        message: 'Update memory failed: HTTP 500: Internal Server Error',
      });
    });

    const hook = expectHookReady();
    // AC-R4: error channel carries the failure message
    expect(hook.error).toBe('Update memory failed: HTTP 500: Internal Server Error');
    // Memories list is NOT mutated — the card keeps its draft locally
    expect(hook.memories).toHaveLength(5);
    const target = hook.memories.find((m) => m.id === '3');
    expect(target?.title).toBe('Charlie');

    // AC-R1 spirit: no re-fetch on incremental failure either
    const calls = getVSCodePostMessageMock().mock.calls;
    const newGetMemoriesCalls = calls
      .slice(baselineCalls)
      .filter(([type]) => type === 'getMemories');
    expect(newGetMemoriesCalls).toHaveLength(0);
  });
});

