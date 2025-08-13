
import { Layout } from "@/components/layout/Layout";
import { AuthForm } from "@/components/auth/AuthForm";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, resetPassword, isLoading, user } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">("login");
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  
  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const path = location.pathname;
      
      // Check if this is an OAuth callback
      if (path === '/auth/callback' || path === '/' && location.hash.includes('access_token')) {
        console.log('OAuth callback detected, processing...');
        setIsProcessingCallback(true);
        
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('OAuth callback error:', error);
            toast({
              title: "Authentication Error",
              description: error.message || "Failed to process login",
              variant: "destructive",
            });
            navigate('/auth/login');
            return;
          }
          
          if (data.session) {
            console.log('OAuth callback successful, redirecting to dashboard');
            toast({
              title: "Welcome!",
              description: "Successfully signed in. Redirecting to dashboard...",
            });
            
            // Get redirect path from localStorage or default to dashboard
            const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
            localStorage.removeItem('redirectAfterLogin');
            navigate(redirectPath);
            return;
          }
        } catch (error: any) {
          console.error('OAuth processing error:', error);
          toast({
            title: "Authentication Error", 
            description: "Failed to process login callback",
            variant: "destructive",
          });
          navigate('/auth/login');
          return;
        } finally {
          setIsProcessingCallback(false);
        }
      }
    };
    
    handleOAuthCallback();
  }, [location, navigate, toast]);
  
  // Redirect if already logged in - but only if not on callback routes
  useEffect(() => {
    const path = location.pathname;
    if (user && !path.includes('/auth/callback') && path !== '/') {
      navigate('/dashboard');
    } else if (user && path === '/' && !location.hash.includes('access_token')) {
      // For root path without OAuth tokens, redirect to dashboard
      navigate('/dashboard');
    }
  }, [user, navigate, location]);

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

  const handleSubmit = async (data: any) => {
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
