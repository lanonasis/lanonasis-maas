
import { Layout } from "@/components/layout/Layout";
import { AuthForm } from "@/components/auth/AuthForm";
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, isLoading, user, isProcessingCallback, handleOAuthCallback } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">("login");
  const hasRedirectedRef = useRef(false);
  
  // Handle OAuth callback
  useEffect(() => {
    handleOAuthCallback(location.pathname, location.hash);
  }, [location, handleOAuthCallback]);
  
  // Redirect if already logged in - but only if not on callback routes
  useEffect(() => {
    const path = location.pathname;
    
    // Prevent infinite redirect loops
    if (hasRedirectedRef.current || !user) {
      return;
    }
    
    // Don't redirect if already on dashboard
    if (path === '/dashboard') {
      return;
    }
    
    // Check if this might be an OAuth callback before redirecting
    const isOAuthCallback = path === '/auth/callback' || 
      (path === '/' && (
        location.hash.includes('access_token') || 
        location.hash.includes('id_token') || 
        location.hash.includes('code') || 
        location.hash.includes('state')
      ));
    
    if (user && !isOAuthCallback) {
      // Set redirect guard and use replace to avoid history stacking
      hasRedirectedRef.current = true;
      navigate('/dashboard', { replace: true });
      
      // Clear redirect guard after navigation
      setTimeout(() => {
        hasRedirectedRef.current = false;
      }, 1000);
    }
  }, [user, navigate, location]);
  
  // Reset redirect guard on logout
  useEffect(() => {
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [user]);

  // Set mode based on URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("register")) {
      setMode("register");
    } else if (path.includes("forgot-password")) {
      setMode("forgot-password");
    } else if (path.includes("callback")) {
      // For callback routes, don't change mode - let the OAuth handler work
      return;
    } else {
      setMode("login");
    }
  }, [location.pathname]);

  const handleSubmit = async (data: { email: string; password: string; name?: string }) => {
    try {
      if (mode === "login") {
        await signIn(data.email, data.password);
      } else if (mode === "register") {
        await signUp(data.email, data.password, {
          full_name: data.name,
        });
      } else if (mode === "forgot-password") {
        await resetPassword(data.email);
        setTimeout(() => {
          navigate("/auth/login");
        }, 2000);
      }
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  // Show loading state for OAuth callback processing
  if (isProcessingCallback) {
    return (
      <Layout>
        <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold">Processing authentication...</h2>
            <p className="text-muted-foreground">Please wait while we log you in.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <AuthForm 
            mode={mode} 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
