import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderWithProviders = (children: React.ReactNode, initialEntries: string[] = ['/dashboard']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockNavigate.mockClear();
  });

  it('should show loading spinner while checking auth', () => {
    // Mock ongoing auth check
    mockFetch.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', async () => {
    const mockSessionResponse = {
      access_token: 'test_token',
      user: {
        id: 'user_123',
        email: 'test@example.com',
        role: 'user',
        project_scope: 'maas'
      }
    };

    const mockProfileResponse = {
      id: 'user_123',
      email: 'test@example.com',
      full_name: 'Test User'
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionResponse)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfileResponse)
      });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Wait for auth check to complete
    await screen.findByText('Protected Content');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    // Wait for redirect to be triggered
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login', { replace: true });
    });

    // Wait until the protected content is removed from the DOM
    await vi.waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('should store redirect path in localStorage when accessing protected route', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    const { rerender } = renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    , ['/dashboard/analytics?tab=overview']);

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login', { replace: true });
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'redirectAfterLogin',
      '/dashboard/analytics?tab=overview'
    );
  });

  it('should not store redirect path for dashboard root', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    , ['/dashboard']);

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login', { replace: true });
    });

    expect(localStorage.setItem).not.toHaveBeenCalledWith(
      'redirectAfterLogin',
      expect.any(String)
    );
  });
});