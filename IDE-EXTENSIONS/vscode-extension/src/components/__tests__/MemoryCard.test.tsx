import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MemoryCard from '../MemoryCard';
import { createMockMemory } from '../../test/setup';

// Mock the Icon component
vi.mock('../Icon', () => ({
  default: ({ type, className }: { type: string; className?: string }) => (
    <div data-testid={`icon-${type}`} className={className}>
      Icon-{type}
    </div>
  )
}));

describe('MemoryCard Component', () => {
  const mockOnSelect = vi.fn();
  const mockMemory = createMockMemory();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders memory card with title and date', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type={mockMemory.type}
        date={mockMemory.date}
        tags={mockMemory.tags}
        content={mockMemory.content}
        iconType={mockMemory.iconType}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(mockMemory.title)).toBeInTheDocument();
    // MemoryCard formats as "MMM d" (no year)
    expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
  });

  test('displays tags correctly', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type={mockMemory.type}
        date={mockMemory.date}
        tags={['tag1', 'tag2', 'tag3']}
        content={mockMemory.content}
        iconType={mockMemory.iconType}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('#tag1')).toBeInTheDocument();
    expect(screen.getByText('#tag2')).toBeInTheDocument();
    expect(screen.getByText('#tag3')).toBeInTheDocument();
  });

  test('calls onSelect when card is clicked', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type={mockMemory.type}
        date={mockMemory.date}
        tags={mockMemory.tags}
        content={mockMemory.content}
        iconType={mockMemory.iconType}
        onSelect={mockOnSelect}
      />
    );

    const card = screen.getByRole('article');
    fireEvent.click(card);

    expect(mockOnSelect).toHaveBeenCalledWith(mockMemory.id);
  });

  test('displays correct icon type', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type={mockMemory.type}
        date={mockMemory.date}
        tags={mockMemory.tags}
        content={mockMemory.content}
        iconType="terminal"
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByTestId('icon-terminal')).toBeInTheDocument();
  });

  test('formats date correctly for string input as well', () => {
    const memoryWithFormattedDate = createMockMemory({
      date: new Date('2024-01-15T10:30:00Z')
    });

    render(
      <MemoryCard
        id={memoryWithFormattedDate.id}
        title={memoryWithFormattedDate.title}
        type={memoryWithFormattedDate.type}
        date={memoryWithFormattedDate.date}
        tags={memoryWithFormattedDate.tags}
        content={memoryWithFormattedDate.content}
        iconType={memoryWithFormattedDate.iconType}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
  });

  test('displays memory type badge', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type="project"
        date={mockMemory.date}
        tags={mockMemory.tags}
        content={mockMemory.content}
        iconType={mockMemory.iconType}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('project')).toBeInTheDocument();
  });

  test('handles empty tags array', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type={mockMemory.type}
        date={mockMemory.date}
        tags={[]}
        content={mockMemory.content}
        iconType={mockMemory.iconType}
        onSelect={mockOnSelect}
      />
    );

    // Should not render any tag elements
    expect(screen.queryByText(/#/)).not.toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type={mockMemory.type}
        date={mockMemory.date}
        tags={mockMemory.tags}
        content={mockMemory.content}
        iconType={mockMemory.iconType}
        onSelect={mockOnSelect}
      />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', expect.stringContaining(mockMemory.title));
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  test('handles keyboard navigation', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type={mockMemory.type}
        date={mockMemory.date}
        tags={mockMemory.tags}
        content={mockMemory.content}
        iconType={mockMemory.iconType}
        onSelect={mockOnSelect}
      />
    );

    const card = screen.getByRole('article');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(mockOnSelect).toHaveBeenCalledWith(mockMemory.id);
  });

  test('applies hover styles class', () => {
    render(
      <MemoryCard
        id={mockMemory.id}
        title={mockMemory.title}
        type={mockMemory.type}
        date={mockMemory.date}
        tags={mockMemory.tags}
        content={mockMemory.content}
        iconType={mockMemory.iconType}
        onSelect={mockOnSelect}
      />
    );

    const card = screen.getByRole('article');
    expect(card).toHaveClass('hover:border-[#007ACC]');
  });

  test('renders different icon types correctly', () => {
    const iconTypes: Array<'terminal' | 'filecode' | 'hash' | 'calendar' | 'lightbulb' | 'briefcase' | 'user' | 'settings'> = 
      ['terminal', 'filecode', 'hash', 'calendar', 'lightbulb', 'briefcase', 'user', 'settings'];

    iconTypes.forEach(iconType => {
      const { unmount } = render(
        <MemoryCard
          id={mockMemory.id}
          title={mockMemory.title}
          type={mockMemory.type}
          date={mockMemory.date}
          tags={mockMemory.tags}
          content={mockMemory.content}
          iconType={iconType}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByTestId(`icon-${iconType}`)).toBeInTheDocument();
      unmount();
    });
  });
});
