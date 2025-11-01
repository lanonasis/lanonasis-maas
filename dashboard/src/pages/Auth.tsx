
import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AuthCallback from "./AuthCallback";

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already authenticated via Core Gateway
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_AUTH_GATEWAY_URL}/v1/auth/session`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
          navigate('/dashboard');
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [navigate]);

  // Handle different auth routes
  if (location.pathname.includes('/auth/callback')) {
    return <AuthCallback />;
  }

  // Redirect to Central Auth Gateway for login (or directly to dashboard in mock mode)
  const handleLogin = () => {
    // Check if we're in mock user mode
    const mockUserMode = true; // Should match MOCK_USER_MODE in useAuth
    
    if (mockUserMode) {
      // In mock mode, directly navigate to dashboard
      navigate('/dashboard');
      return;
    }
    
    // Production mode: redirect to Core Gateway
    const redirectUri = `${window.location.origin}/auth/callback`;
    window.location.href = `${import.meta.env.VITE_AUTH_GATEWAY_URL}/v1/auth/login?redirect_uri=${redirectUri}&project_scope=maas`;
  };

  if (isCheckingAuth) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-12">
          <Card className="w-full max-w-md p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication status...</p>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  // Show login screen with Central Auth Gateway integration
  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Lan Onasis MaaS
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Memory as a Service Platform
              </p>
            </div>

            {searchParams.get('error') && (
              <Alert variant="destructive">
                <AlertDescription>
                  {searchParams.get('error_description') || 'Authentication failed'}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Button 
                onClick={handleLogin}
                className="w-full"
                size="lg"
              >
                Sign In with Lan Onasis
              </Button>
              
              <div className="text-sm text-center text-gray-500">
                <p>Secure authentication via Central Gateway</p>
                <p className="mt-1">Project scope: MaaS</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-center text-gray-400 space-y-1">
                <p>🔒 Privacy-first authentication</p>
                <p>🛡️ Enterprise-grade security</p>
                <p>📊 Comprehensive audit logging</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
