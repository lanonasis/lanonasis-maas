import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuthCallback from '@/pages/AuthCallback';

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

const clearSearchParams = () => {
  // URLSearchParams does not support clear(); delete each key
  for (const key of Array.from(mockSearchParams.keys())) {
    mockSearchParams.delete(key);
  }
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderWithRouter = (children: React.ReactNode) => render(children);

describe('AuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockNavigate.mockClear();
    // Reset the URLSearchParams instance between tests
    mockSearchParams = new URLSearchParams();
    clearSearchParams();
    localStorage.clear();
  });

  it('should show processing state initially', () => {
    mockSearchParams.set('code', 'test_auth_code');

    // Mock ongoing callback request
    mockFetch.mockImplementation(() => new Promise(() => {}));

    vi.useFakeTimers();
    renderWithRouter(<AuthCallback />);

    expect(screen.getByText('Processing Authentication')).toBeInTheDocument();
    expect(screen.getByText(/Completing your sign-in/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('should handle successful OAuth callback', async () => {
    const authCode = 'test_auth_code_12345';
    const state = 'test_state';
    
    mockSearchParams.set('code', authCode);
    mockSearchParams.set('state', state);

    const mockSessionResponse = {
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
      expires_at: Date.now() + 3600000,
      user: {
        id: 'user_123',
        email: 'user@example.com',
        role: 'user',
        project_scope: 'maas'
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSessionResponse)
    });

    renderWithRouter(<AuthCallback />);

    // Should call callback endpoint
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/v1/auth/callback',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-project-scope': 'maas'
          }),
          body: JSON.stringify({
            code: authCode,
            state: state,
            project_scope: 'maas'
          }),
          credentials: 'include'
        })
      );
    });

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('Authentication Successful')).toBeInTheDocument();
    });

    expect(screen.getByText(/Redirecting to your dashboard/)).toBeInTheDocument();

    // Advance timers to trigger delayed redirect
    vi.advanceTimersByTime(2000);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    vi.useRealTimers();
  });

  it('should handle OAuth error in URL parameters', async () => {
    mockSearchParams.set('error', 'access_denied');
    mockSearchParams.set('error_description', 'User cancelled the authorization');

    renderWithRouter(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    });

    expect(screen.getByText('User cancelled the authorization')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle missing authorization code', async () => {
    // No code parameter
    mockSearchParams.set('state', 'test_state');

    renderWithRouter(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    });

    expect(screen.getByText('Authorization code not found')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle callback API failure', async () => {
    const authCode = 'test_auth_code';
    mockSearchParams.set('code', authCode);

    const errorResponse = {
      error: 'Invalid authorization code',
      code: 'AUTH_INVALID'
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve(errorResponse)
    });

    renderWithRouter(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    });

    expect(screen.getByText('Invalid authorization code')).toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    const authCode = 'test_auth_code';
    mockSearchParams.set('code', authCode);

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error during authentication')).toBeInTheDocument();
  });

  it('should use stored redirect path after successful auth', async () => {
    const authCode = 'test_auth_code';
    const redirectPath = '/dashboard/analytics';
    
    mockSearchParams.set('code', authCode);
    localStorage.setItem('redirectAfterLogin', redirectPath);

    const mockSessionResponse = {
      access_token: 'token',
      user: { id: 'user_123', email: 'user@example.com' }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSessionResponse)
    });

    renderWithRouter(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText('Authentication Successful')).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2000);
    expect(mockNavigate).toHaveBeenCalledWith(redirectPath);

    expect(localStorage.getItem('redirectAfterLogin')).toBeNull();
    vi.useRealTimers();
  });

  it('should redirect to dashboard by default when no stored path', async () => {
    const authCode = 'test_auth_code';
    mockSearchParams.set('code', authCode);

    const mockSessionResponse = {
      access_token: 'token',
      user: { id: 'user_123', email: 'user@example.com' }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSessionResponse)
    });

    renderWithRouter(<AuthCallback />);

    await waitFor(() => {
      expect(screen.getByText('Authentication Successful')).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2000);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    vi.useRealTimers();
  });
});