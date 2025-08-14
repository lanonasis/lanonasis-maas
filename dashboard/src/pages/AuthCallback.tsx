import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        setError(errorDescription || error);
        return;
      }

      if (!code) {
        setStatus('error');
        setError('Authorization code not found');
        return;
      }

      try {
        // Exchange code for session with Central Auth Gateway
        const response = await fetch(`${import.meta.env.VITE_AUTH_GATEWAY_URL}/v1/auth/callback`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-project-scope': 'maas' // Ensure project scope for MaaS
          },
          body: JSON.stringify({ 
            code,
            ...(state ? { state } : {}),
            project_scope: 'maas'
          }),
          credentials: 'include' // Important for cookies
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Auth callback successful:', data);
          setStatus('success');
          
          // Redirect to dashboard after brief success message
          setTimeout(() => {
            const storedPath = localStorage.getItem('redirectAfterLogin');
            if (storedPath) {
              localStorage.removeItem('redirectAfterLogin');
              navigate(storedPath);
            } else {
              navigate('/dashboard');
            }
          }, 2000);
        } else {
          const errorData = await response.json().catch(() => ({}));
          setStatus('error');
          setError(errorData.message || (errorData.error as string) || `Authentication failed (${response.status})`);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setError('Network error during authentication');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    window.location.href = `${import.meta.env.VITE_AUTH_GATEWAY_URL}/v1/auth/login?redirect_uri=${redirectUri}&project_scope=maas`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-4">
          {status === 'processing' && (
            <>
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Processing Authentication
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Completing your sign-in with Lan Onasis MaaS...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Authentication Successful
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Welcome to Lan Onasis MaaS! Redirecting to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Authentication Failed
              </h1>
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuthCallback;