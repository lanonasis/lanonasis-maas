import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthFlow from '../AuthFlow';

describe('AuthFlow Component', () => {
  const mockOnLogin = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders login button when not authenticated', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByText(/login/i)).toBeInTheDocument();
    expect(screen.queryByText(/logout/i)).not.toBeInTheDocument();
  });

  test('renders logout button when authenticated', () => {
    render(
      <AuthFlow
        isAuthenticated={true}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByText(/logout/i)).toBeInTheDocument();
    expect(screen.queryByText(/login/i)).not.toBeInTheDocument();
  });

  test('calls onLogin when login button is clicked', async () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const loginButton = screen.getByText(/login/i);
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  test('calls onLogout when logout button is clicked', async () => {
    render(
      <AuthFlow
        isAuthenticated={true}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const logoutButton = screen.getByText(/logout/i);
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockOnLogout).toHaveBeenCalled();
    });
  });

  test('shows loading spinner when isLoading is true', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={true}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
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

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  test('shows OAuth2 as default auth method', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByText(/oauth2/i)).toBeInTheDocument();
    expect(screen.getByText(/api key/i)).toBeInTheDocument();
  });

  test('allows switching between OAuth2 and API Key methods', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const apiKeyTab = screen.getByText(/api key/i);
    fireEvent.click(apiKeyTab);

    expect(screen.getByText(/enter your api key/i)).toBeInTheDocument();
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

    expect(screen.getByText(/connected/i)).toBeInTheDocument();
    expect(screen.getByText(/authenticated/i)).toBeInTheDocument();
  });

  test('displays disconnected status when not authenticated', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    expect(screen.getByText(/not authenticated/i)).toBeInTheDocument();
  });

  test('disables buttons during loading', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={true}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const loginButton = screen.getByText(/login/i);
    expect(loginButton).toBeDisabled();
  });

  test('shows API Key input when API Key method is selected', () => {
    render(
      <AuthFlow
        isAuthenticated={false}
        isLoading={false}
        onLogin={mockOnLogin}
        onLogout={mockOnLogout}
        error={null}
      />
    );

    const apiKeyTab = screen.getByText(/api key/i);
    fireEvent.click(apiKeyTab);

    expect(screen.getByPlaceholderText(/enter api key/i)).toBeInTheDocument();
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
