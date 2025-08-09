import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Shield, Key, Database } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface ClientInfo {
  client_id: string;
  client_name: string;
  scopes: string[];
}

export default function OAuthAuthorize() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);

  // OAuth parameters
  const clientId = searchParams.get('client_id');
  const responseType = searchParams.get('response_type');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  
  // Device flow parameters
  const userCode = searchParams.get('user_code');

  useEffect(() => {
    // Validate parameters
    if (!clientId) {
      setError('Missing client_id parameter');
      return;
    }

    // Load client information
    loadClientInfo(clientId);

    // If not logged in, redirect to login with return URL
    if (!user) {
      const returnUrl = window.location.href;
      navigate(`/auth/login?return_to=${encodeURIComponent(returnUrl)}`);
    }
  }, [clientId, user, navigate]);

  const loadClientInfo = async (clientId: string) => {
    // Map client IDs to friendly names
    const clientMap: Record<string, string> = {
      'lanonasis-mcp-cli': 'Lan Onasis CLI',
      'lanonasis-mcp-desktop': 'Lan Onasis Desktop',
      'lanonasis-mcp-mobile': 'Lan Onasis Mobile',
      'lanonasis-vscode': 'Lan Onasis VSCode Extension',
      'lanonasis-cursor': 'Lan Onasis Cursor Extension',
      'lanonasis-windsurf': 'Lan Onasis Windsurf Extension'
    };

    setClientInfo({
      client_id: clientId,
      client_name: clientMap[clientId] || 'Unknown Application',
      scopes: scope?.split(' ') || []
    });
  };

  const handleAuthorize = async () => {
    if (!user || !clientId) return;

    setLoading(true);
    setError(null);

    try {
      if (userCode) {
        // Device flow authorization
        const { error } = await supabase.functions.invoke('oauth-device-authorize', {
          body: {
            user_code: userCode,
            user_id: user.id
          }
        });

        if (error) throw error;

        // Show success for device flow
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full text-center">
              <div className="bg-white p-8 rounded-lg shadow">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Device Authorized!</h2>
                <p className="text-gray-600">
                  You can now return to your terminal or close this window.
                </p>
              </div>
            </div>
          </div>
        );
      } else {
        // Authorization code flow
        const { data, error } = await supabase.functions.invoke('oauth-authorize', {
          body: {
            client_id: clientId,
            user_id: user.id,
            redirect_uri: redirectUri,
            scope: scope,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod
          }
        });

        if (error) throw error;

        // Redirect back to client with authorization code
        const callbackUrl = new URL(redirectUri!);
        callbackUrl.searchParams.set('code', data.authorization_code);
        if (state) {
          callbackUrl.searchParams.set('state', state);
        }

        window.location.href = callbackUrl.toString();
      }
    } catch (err: any) {
      console.error('Authorization error:', err);
      setError(err.message || 'Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    if (redirectUri) {
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('error', 'access_denied');
      callbackUrl.searchParams.set('error_description', 'User denied authorization');
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }
      window.location.href = callbackUrl.toString();
    } else {
      window.close();
    }
  };

  const scopeDescriptions: Record<string, { icon: any; description: string }> = {
    'mcp:read': {
      icon: Database,
      description: 'Read your memory entries and search memories'
    },
    'mcp:write': {
      icon: Database,
      description: 'Create, update, and delete memory entries'
    },
    'api_keys:manage': {
      icon: Key,
      description: 'Create and manage API keys on your behalf'
    }
  };

  if (!clientInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
            <Shield className="w-12 h-12 mx-auto mb-3" />
            <h1 className="text-2xl font-bold">Authorize Access</h1>
            <p className="text-blue-100 mt-2">{clientInfo.client_name}</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-600 text-center">
                <strong>{clientInfo.client_name}</strong> wants to access your Lan Onasis account
              </p>
            </div>

            {/* Permissions */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">This application will be able to:</h3>
              <ul className="space-y-3">
                {clientInfo.scopes.map((scope) => {
                  const info = scopeDescriptions[scope];
                  if (!info) return null;
                  
                  return (
                    <li key={scope} className="flex items-start">
                      <info.icon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{info.description}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* User info */}
            {user && (
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-500">
                  Authorizing as <strong>{user.email}</strong>
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <AnimatedButton
                onClick={handleAuthorize}
                disabled={loading || !user}
                fullWidth
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {loading ? 'Authorizing...' : 'Authorize'}
              </AnimatedButton>
              
              <AnimatedButton
                onClick={handleDeny}
                disabled={loading}
                variant="secondary"
                fullWidth
              >
                Deny
              </AnimatedButton>
            </div>

            {/* Device code display */}
            {userCode && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 mb-2">Device code:</p>
                <p className="text-2xl font-mono font-bold text-blue-600">{userCode}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4">
            <p className="text-xs text-gray-500 text-center">
              By authorizing, you agree to share the requested information with {clientInfo.client_name}.
              You can revoke access at any time from your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}