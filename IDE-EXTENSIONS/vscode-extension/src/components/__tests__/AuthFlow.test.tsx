import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthFlow from '../AuthFlow';

describe('AuthFlow Component', () => {
  const mockOnLogin = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders connect buttons when not authenticated', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByTestId('btn-connect-browser')).toBeInTheDocument();
    expect(screen.getByTestId('btn-enter-key')).toBeInTheDocument();
    expect(screen.queryByText(/disconnect/i)).not.toBeInTheDocument();
  });

  test('renders disconnect button when authenticated', () => {
    render(
      <AuthFlow
        isAuthenticated={true}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByText(/disconnect/i)).toBeInTheDocument();
    expect(screen.queryByText(/connect to lanonasis/i)).not.toBeInTheDocument();
  });

  test('calls onLogin when connect button is clicked', async () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const connectButton = screen.getByTestId('btn-connect-browser');
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  test('calls onLogout when disconnect button is clicked', async () => {
    render(
      <AuthFlow
        isAuthenticated={true}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const disconnectButton = screen.getByText(/disconnect/i);
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(mockOnLogout).toHaveBeenCalled();
    });
  });

  test('shows loading state when isLoading is true', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={true}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    // Spinner has no explicit progressbar role in WelcomeView, assert text instead
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  test('displays error message when error is provided', () => {
    const errorMessage = 'Authentication failed';
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={errorMessage}
      />
    );

    expect(screen.getByText(/connection error/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('shows OAuth2 as default auth method and API Key toggle', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getAllByText(/oauth2/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/api key/i).length).toBeGreaterThan(0);
  });

  test('shows API Key method info after switching tab', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const apiKeyTab = screen.getByRole('button', { name: /^api key$/i });
    fireEvent.click(apiKeyTab);

    expect(screen.getByText(/api key authentication/i)).toBeInTheDocument();
  });

  test('displays connection status when authenticated', () => {
    render(
      <AuthFlow
        isAuthenticated={true}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByText(/connected to lanonasis/i)).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  test('shows connect view when not authenticated', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByTestId('btn-connect-browser')).toBeInTheDocument();
  });

  test('disables connect button during loading', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={true}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const button = screen.getByRole('button', { name: /connecting/i });
    expect(button).toBeDisabled();
  });

  test('hides error message when error is cleared', () => {
    const { rerender } = render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error="Authentication failed"
      />
    );

    expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();

    rerender(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.queryByText(/authentication failed/i)).not.toBeInTheDocument();
  });
});
