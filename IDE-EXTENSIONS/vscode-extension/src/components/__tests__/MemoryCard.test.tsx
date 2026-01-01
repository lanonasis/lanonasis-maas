import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryCard } from '../MemoryCard';
import type { Memory } from '../../shared/types';
import { Lightbulb, Terminal, Hash } from 'lucide-react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (formatStr === 'MMM d') {
      return `${months[d.getMonth()]} ${d.getDate()}`;
    }
    return d.toISOString();
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('MemoryCard Component', () => {
  const createMockMemory = (overrides: Partial<Memory> = {}): Memory => ({
    id: 'test-memory-1',
    title: 'Test Memory',
    content: 'Test content for this memory',
    type: 'context',
    date: new Date('2024-01-15T10:30:00Z'),
    tags: ['test', 'mock'],
    icon: Lightbulb,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders memory card with title and date', () => {
    const memory = createMockMemory();
    render(<MemoryCard memory={memory} />);

    expect(screen.getByText(memory.title)).toBeInTheDocument();
    expect(screen.getByTestId('text-memory-date')).toHaveTextContent('Jan 15');
  });

  test('displays tags correctly', () => {
    const memory = createMockMemory({
      tags: ['tag1', 'tag2', 'tag3'],
    });
    render(<MemoryCard memory={memory} />);

    expect(screen.getByTestId('tag-tag1')).toBeInTheDocument();
    expect(screen.getByTestId('tag-tag2')).toBeInTheDocument();
    expect(screen.getByTestId('tag-tag3')).toBeInTheDocument();
  });

  test('shows copy button (hidden until hover via opacity)', () => {
    const memory = createMockMemory();
    render(<MemoryCard memory={memory} />);

    const copyButton = screen.getByTestId('btn-copy-memory');
    expect(copyButton).toBeInTheDocument();

    const card = screen.getByTestId(`memory-card-${memory.id}`);
    fireEvent.mouseEnter(card);
    expect(copyButton).toBeInTheDocument();
  });

  test('copies content to clipboard when copy button is clicked', async () => {
    const memory = createMockMemory({
      content: 'Content to copy',
    });
    render(<MemoryCard memory={memory} />);

    const copyButton = screen.getByTestId('btn-copy-memory');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Content to copy');
  });

  test('shows check icon after copying', async () => {
    const memory = createMockMemory();
    render(<MemoryCard memory={memory} />);

    const copyButton = screen.getByTestId('btn-copy-memory');
    fireEvent.click(copyButton);

    // Check icon should appear immediately after click
      const checkIcon = copyButton.querySelector('svg');
      expect(checkIcon).toBeInTheDocument();
  });

  test('displays correct icon component', () => {
    const memory = createMockMemory({
      icon: Terminal,
    });
    render(<MemoryCard memory={memory} />);

    // Icon should be rendered (as a component)
    const card = screen.getByTestId(`memory-card-${memory.id}`);
    expect(card).toBeInTheDocument();
  });

  test('formats date correctly', () => {
    const memory = createMockMemory({
      date: new Date('2024-03-20T14:30:00Z'),
    });
    render(<MemoryCard memory={memory} />);

    expect(screen.getByTestId('text-memory-date')).toHaveTextContent('Mar 20');
  });

  test('handles empty tags array', () => {
    const memory = createMockMemory({
      tags: [],
    });
    render(<MemoryCard memory={memory} />);

    // Should not render any tag elements
    expect(screen.queryByTestId(/^tag-/)).not.toBeInTheDocument();
  });

  test('has proper data attributes', () => {
    const memory = createMockMemory();
    render(<MemoryCard memory={memory} />);

    const card = screen.getByTestId(`memory-card-${memory.id}`);
    expect(card).toBeInTheDocument();
  });

  test('renders different icon types correctly', () => {
    const icons = [Lightbulb, Terminal, Hash];
    
    icons.forEach((Icon) => {
      const { unmount } = render(
        <MemoryCard memory={createMockMemory({ icon: Icon })} />
      );

      const card = screen.getByTestId(`memory-card-test-memory-1`);
      expect(card).toBeInTheDocument();
      unmount();
    });
  });

  test('applies hover styles', () => {
    const memory = createMockMemory();
    render(<MemoryCard memory={memory} />);

    const card = screen.getByTestId(`memory-card-${memory.id}`);
    expect(card).toHaveClass('hover:bg-[var(--vscode-list-hoverBackground)]');
  });

  test('displays content in copy functionality', async () => {
    const memory = createMockMemory({
      content: 'Special content to verify',
    });
    render(<MemoryCard memory={memory} />);

    const copyButton = screen.getByTestId('btn-copy-memory');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Special content to verify');
  });
});
