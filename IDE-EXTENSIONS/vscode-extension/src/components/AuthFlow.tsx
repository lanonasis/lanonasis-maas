import React, { useState } from 'react';
import { WelcomeView } from './WelcomeView';
import { cn } from '../utils/cn';

export interface AuthFlowProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  onLogin: (mode?: 'oauth' | 'apikey') => void;
  onLogout?: () => void;
  error?: string | null;
  className?: string;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ 
  isAuthenticated, 
  isLoading, 
  onLogin, 
  onLogout, 
  error, 
  className 
}) => {
  const [authMethod, setAuthMethod] = useState<'oauth' | 'apikey'>('oauth');

  if (isAuthenticated) {
    return (
      <div className={cn("p-4 space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#007ACC] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#CCCCCC]">Connected to Lanonasis</h3>
              <p className="text-xs text-[#888888]">Your memories are synced and ready</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1 text-xs border border-[#2D2D2D] rounded hover:border-[#007ACC] hover:text-[#007ACC] transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
        
        {/* Connection Status */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#252526] p-2 rounded border border-[#2D2D2D]">
            <div className="text-[#888888]">Status</div>
            <div className="text-[#007ACC] font-medium">Active</div>
          </div>
          <div className="bg-[#252526] p-2 rounded border border-[#2D2D2D]">
            <div className="text-[#888888]">Method</div>
            <div className="text-[#CCCCCC] font-medium capitalize">{authMethod}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-[#4A1F1F] border border-[#8B2F2F] rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-[#E06C75] text-sm">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-[#E06C75]">Connection Error</h4>
              <p className="text-xs text-[#B06C75] mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Auth Method Selection */}
      <div className="mb-4">
        <div className="flex gap-2 p-1 bg-[#252526] rounded-lg border border-[#2D2D2D]">
          <button
            onClick={() => setAuthMethod('oauth')}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium rounded transition-colors",
              authMethod === 'oauth'
                ? "bg-[#007ACC] text-white"
                : "text-[#888888] hover:text-[#CCCCCC]"
            )}
          >
            OAuth2
          </button>
          <button
            onClick={() => setAuthMethod('apikey')}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium rounded transition-colors",
              authMethod === 'apikey'
                ? "bg-[#007ACC] text-white"
                : "text-[#888888] hover:text-[#CCCCCC]"
            )}
          >
            API Key
          </button>
        </div>
      </div>

      {/* Welcome View */}
      <WelcomeView 
        onLogin={(mode) => {
          const selected = mode ?? authMethod;
          setAuthMethod(selected);
          onLogin(selected);
        }}
        isLoading={isLoading}
      />

      {/* Auth Method Info */}
      <div className="mt-4 p-3 bg-[#252526] border border-[#2D2D2D] rounded-lg">
        <h4 className="text-xs font-medium text-[#CCCCCC] mb-2">
          {authMethod === 'oauth' ? '🔐 OAuth2 Authentication' : '🔑 API Key Authentication'}
        </h4>
        <div className="text-xs text-[#888888] space-y-1">
          {authMethod === 'oauth' ? (
            <>
              <div>• Secure browser-based authentication</div>
              <div>• Single sign-on with your Lanonasis account</div>
              <div>• Token automatically refreshed</div>
            </>
          ) : (
            <>
              <div>• Direct API access with personal key</div>
              <div>• Full control over authentication</div>
              <div>• Suitable for automated workflows</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthFlow;
