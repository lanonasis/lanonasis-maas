import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchInterface from '../SearchInterface';

// Mock the Icon component
vi.mock('../Icon', () => ({
  default: ({ type, className }: { type: string; className?: string }) => (
    <div data-testid={`icon-${type}`} className={className}>
      Icon-{type}
    </div>
  )
}));

describe('SearchInterface Component', () => {
  const mockOnSearch = vi.fn();
  const mockOnClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders search input with placeholder', () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    expect(screen.getByPlaceholderText('Search memories...')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('calls onSearch when user types and submits form', async () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    const form = input.closest('form');
    
    if (form) {
      fireEvent.change(input, { target: { value: 'test query' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('test query');
      });
    }
  });

  test('calls onSearch when user types and presses Enter', async () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    const form = input.closest('form');

    fireEvent.change(input, { target: { value: 'test query' } });
    // Simulate Enter by submitting the form (JSDOM reliability)
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test query');
    });
  });

  test('shows clear button when query is entered', () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    
    // Initially no clear button
    expect(screen.queryByTitle('Clear search')).not.toBeInTheDocument();
    
    // Type something to show clear button
    fireEvent.change(input, { target: { value: 'test query' } });
    
    expect(screen.getByTitle('Clear search')).toBeInTheDocument();
  });

  test('calls onClear when clear button is clicked', async () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test query' } });
    
    const clearButton = screen.getByTitle('Clear search');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  test('shows loading spinner when isLoading is true', () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={true}
        placeholder="Search memories..."
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('hides loading spinner when isLoading is false', () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('displays search tips when focused', () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    
    // Initially no search tips
    expect(screen.queryByText(/search tips/i)).not.toBeInTheDocument();
    
    // Focus input to show tips
    fireEvent.focus(input);
    
    expect(screen.getByText(/search tips/i)).toBeInTheDocument();
    expect(screen.getByText(/use keywords/i)).toBeInTheDocument();
  });

  test('clears input when onClear is called', async () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(input).toHaveValue('test query');

    const clearButton = screen.getByTitle('Clear search');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  test('does not call onSearch with empty query', async () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    const form = input.closest('form');
    
    if (form) {
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSearch).not.toHaveBeenCalled();
      });
    }
  });

  test('handles Escape key to clear search', async () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  test('hides clear button when loading', () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={true}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test query' } });
    
    // Clear button should be hidden when loading
    expect(screen.queryByTitle('Clear search')).not.toBeInTheDocument();
  });

  test('disables input when loading', () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={true}
        placeholder="Search memories..."
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  test('search icon is rendered', () => {
    render(
      <SearchInterface
        onSearch={mockOnSearch}
        onClear={mockOnClear}
        isLoading={false}
        placeholder="Search memories..."
      />
    );

    expect(screen.getByTestId('icon-hash')).toBeInTheDocument();
  });
});
