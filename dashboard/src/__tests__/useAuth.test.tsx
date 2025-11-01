import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { ReactNode } from 'react';

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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const createWrapper = ({ children }: { children: ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Session Check', () => {
    it('should check auth status on mount', async () => {
      const mockSessionResponse = {
        access_token: 'test_token',
        user: {
          id: 'user_123',
          email: 'test@example.com',
          role: 'user',
          project_scope: 'maas'
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSessionResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'user_123',
            email: 'test@example.com',
            full_name: 'Test User'
          })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/v1/auth/session',
        expect.objectContaining({
          credentials: 'include'
        })
      );

      expect(result.current.user).toEqual(mockSessionResponse.user);
      expect(result.current.session).toEqual(mockSessionResponse);
    });

    it('should handle auth check failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });
  });

  describe('Sign In', () => {
    it('should sign in successfully', async () => {
      const mockLoginResponse = {
        access_token: 'new_token',
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

      // Mock session check (initial) - no session
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        })
        // Mock login request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLoginResponse)
        })
        // Mock profile fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfileResponse)
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Call signIn
      await result.current.signIn('test@example.com', 'password');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-project-scope': 'maas'
          }),
          credentials: 'include',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password',
            project_scope: 'maas'
          })
        })
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle sign in failure', async () => {
      // Mock session check (initial) - no session
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        })
        // Mock failed login
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({
            error: 'Invalid credentials'
          })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('test@example.com', 'wrong_password');
      // Should not navigate on failure
      expect(mockNavigate).not.toHaveBeenCalled();
      // Should keep unauthenticated state
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });
  });

  describe('Sign Up', () => {
    it('should sign up successfully', async () => {
      // Mock session check (initial) - no session
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        })
        // Mock successful registration
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            message: 'User registered successfully'
          })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signUp(
        'newuser@example.com',
        'password123',
        {
          full_name: 'New User',
          company_name: 'Test Company'
        }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/v1/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-project-scope': 'maas'
          }),
          body: JSON.stringify({
            email: 'newuser@example.com',
            password: 'password123',
            project_scope: 'maas',
            user_metadata: {
              full_name: 'New User',
              company_name: 'Test Company'
            }
          })
        })
      );

      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      // Mock session check (initial) - has session
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'token',
            user: { id: 'user_123', email: 'test@example.com' }
          })
        })
        // Mock profile fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'user_123' })
        })
        // Mock logout
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Logout successful' })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper
      });

      await waitFor(() => {
        expect(result.current.user).not.toBe(null);
      });

      await result.current.signOut();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: expect.objectContaining({
            'x-project-scope': 'maas'
          })
        })
      );

      // Navigates home and clears auth state
      expect(mockNavigate).toHaveBeenCalledWith('/');

      await waitFor(() => {
        expect(result.current.user).toBe(null);
        expect(result.current.session).toBe(null);
      });
    });
  });

  describe('Reset Password', () => {
    it('should send password reset email successfully', async () => {
      // Mock session check (initial) - no session
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        })
        // Mock password reset
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            message: 'Password reset email sent'
          })
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.resetPassword('test@example.com');

      const expectedBody = JSON.stringify({
        email: 'test@example.com',
        redirect_url: `${window.location.origin}/auth/reset-password`
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lanonasis.com/v1/auth/reset-password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-project-scope': 'maas'
          }),
          body: expectedBody
        })
      );
    });
  });
});