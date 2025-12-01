
import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Session, User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
};

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isProcessingCallback: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: {
    full_name: string;
    company_name?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  handleOAuthCallback: (pathname: string, hash: string) => Promise<boolean>;
  signInWithOAuth: (provider: 'google' | 'github' | 'linkedin' | 'discord') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
        setIsLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
          
          // Handle OAuth callback - create profile if it doesn't exist (as per OAUTH_SETUP_GUIDE.md)
          if (event === 'SIGNED_IN' && session.user.app_metadata.provider !== 'email') {
            const provider = session.user.app_metadata.provider;
            console.log('OAuth sign-in detected, provider:', provider);
            
            await createProfileForOAuthUser(session.user, provider);
            
            // Redirect to dashboard after OAuth login
            console.log('Redirecting to dashboard after OAuth login');
            toast({
              title: "Welcome!",
              description: `Successfully signed in with ${provider}. Redirecting to dashboard...`,
            });
            
            // Use setTimeout to ensure state updates are complete
            setTimeout(() => {
              const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
              localStorage.removeItem('redirectAfterLogin');
              navigate(redirectPath);
            }, 100);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const createProfileForOAuthUser = async (user: User, provider: string) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id as any)
      .single();
    
    if (!existingProfile) {
      console.log(`Creating new profile for ${provider} OAuth user`);
      
      // Provider-specific metadata extraction (as per OAUTH_SETUP_GUIDE.md)
      let profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata.full_name || user.user_metadata.name || null,
        avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Provider-specific enhancements
      switch (provider) {
        case 'github':
          profileData.full_name = profileData.full_name || user.user_metadata.user_name;
          profileData.avatar_url = user.user_metadata.avatar_url;
          break;
        case 'google':
          profileData.avatar_url = user.user_metadata.picture;
          break;
        case 'linkedin':
          profileData.avatar_url = user.user_metadata.picture;
          break;
        case 'discord':
          profileData.avatar_url = user.user_metadata.avatar_url;
          break;
      }
      
      const { error } = await supabase
        .from('profiles')
        .insert(profileData as any);
      
      if (!error) {
        console.log(`Profile created successfully for ${provider} user`);
        await fetchProfile(user.id);
      } else {
        console.error(`Error creating profile for ${provider} user:`, error);
      }
    } else {
      console.log(`Profile already exists for ${provider} user`);
      // Update avatar if missing and provider has one
      if (!(existingProfile as any)?.avatar_url && (user.user_metadata.avatar_url || user.user_metadata.picture)) {
        const newAvatarUrl = user.user_metadata.avatar_url || user.user_metadata.picture;
        await supabase
          .from('profiles')
          .update({ 
            avatar_url: newAvatarUrl,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', user.id as any);
        
        console.log(`Updated avatar for existing ${provider} user`);
      }
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId as any)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      
      // If profile doesn't exist, try to create one using upsert
      if (error.code === 'PGRST116') { // Row not found
        console.log('Profile not found, attempting to create one...');
        
        const { data: session } = await supabase.auth.getSession();
        const currentUser = session.session?.user;
        
        if (currentUser) {
          // Use upsert to handle race conditions atomically
          const { data: upsertedProfile, error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              email: currentUser.email,
              full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || null,
              role: currentUser.user_metadata?.role || 'user',
              avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null,
              updated_at: new Date().toISOString()
            } as any, {
              onConflict: 'id'
            })
            .select()
            .single();
          
          if (upsertError) {
            console.error('Error upserting profile:', upsertError);
            // If upsert fails due to constraint violation, try to fetch existing profile
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId as any)
              .single();
            
            if (!fetchError && existingProfile) {
              console.log('Profile found after conflict, using existing:', existingProfile);
              setProfile(existingProfile as any);
            }
            return;
          }
          
          console.log('Profile upserted successfully:', upsertedProfile);
          setProfile(upsertedProfile as any);
          return;
        }
      }
      
      return;
    }

    setProfile(data as any);
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast({
        title: "Successfully signed in",
        description: "Welcome back!",
      });
      
      // Check if there's a stored redirect path
      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectPath);
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    userData: { full_name: string; company_name?: string }
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            company_name: userData.company_name || null,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account created successfully",
        description: "Please check your email to confirm your account.",
      });
      
      navigate('/auth/login');
    } catch (error: any) {
      toast({
        title: "Error signing up",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleOAuthCallback = async (pathname: string, hash: string): Promise<boolean> => {
    // Check if this is an OAuth callback - prioritize /auth/callback route as per SUPABASE_OAUTH_CONFIG.md
    const isOAuthCallback = pathname === '/auth/callback' || 
      // Fallback: root path with OAuth parameters (for direct URL redirects)
      (pathname === '/' && (
        hash.includes('access_token') || 
        hash.includes('id_token') || 
        hash.includes('code') || 
        hash.includes('state')
      ));
    
    if (!isOAuthCallback) {
      return false;
    }

    console.log('OAuth callback detected, processing...');
    setIsProcessingCallback(true);
    
    try {
      // Extract OAuth state parameter for validation (as per MCP_OAUTH_FLOW_DESIGN.md)
      const urlParams = new URLSearchParams(hash.replace('#', ''));
      const state = urlParams.get('state');
      
      // Validate OAuth state parameter if present (CSRF protection)
      if (state) {
        const storedState = sessionStorage.getItem('oauth_state');
        if (storedState && storedState !== state) {
          console.error('OAuth state mismatch - possible CSRF attack');
          toast({
            title: "Authentication Error",
            description: "Invalid authentication state. Please try again.",
            variant: "destructive",
          });
          navigate('/auth/login');
          return true;
        }
        // Clear stored state after validation
        sessionStorage.removeItem('oauth_state');
      }
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('OAuth callback error:', error);
        toast({
          title: "Authentication Error",
          description: error.message || "Failed to process login",
          variant: "destructive",
        });
        navigate('/auth/login');
        return true;
      }
      
      if (data.session) {
        console.log('OAuth callback successful, setting user state...');
        
        // Update state immediately to prevent blank page
        setSession(data.session);
        setUser(data.session.user);
        
        // Fetch profile if user exists
        if (data.session.user) {
          await fetchProfile(data.session.user.id);
        }
        
        console.log('OAuth callback successful, redirecting to dashboard');
        toast({
          title: "Welcome!",
          description: "Successfully signed in. Redirecting to dashboard...",
        });
        
        // Get redirect path from localStorage or default to dashboard
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard';
        localStorage.removeItem('redirectAfterLogin');
        
        // Small delay to ensure state is set before navigation
        setTimeout(() => {
          navigate(redirectPath);
        }, 100);
        return true;
      }
    } catch (error: any) {
      console.error('OAuth processing error:', error);
      toast({
        title: "Authentication Error", 
        description: "Failed to process login callback",
        variant: "destructive",
      });
      navigate('/auth/login');
      return true;
    } finally {
      setIsProcessingCallback(false);
    }
    
    return true;
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'linkedin' | 'discord') => {
    try {
      // Generate OAuth state parameter for CSRF protection (as per MCP_OAUTH_FLOW_DESIGN.md)
      const state = crypto.randomUUID();
      sessionStorage.setItem('oauth_state', state);
      
      // Environment-specific redirect URLs (as per OAUTH_SETUP_GUIDE.md)
      const getRedirectUrl = () => {
        const origin = window.location.origin;
        // Production: dashboard.lanonasis.com
        if (origin.includes('dashboard.lanonasis.com')) {
          return 'https://dashboard.lanonasis.com/auth/callback';
        }
        // Development: localhost
        if (origin.includes('localhost')) {
          return `${origin}/auth/callback`;
        }
        // Fallback to current origin
        return `${origin}/auth/callback`;
      };
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl(),
          scopes: provider === 'github' ? 'read:user user:email' : undefined,
          queryParams: {
            state: state
          }
        }
      });

      if (error) {
        sessionStorage.removeItem('oauth_state'); // Clean up on error
        throw error;
      }
    } catch (error: any) {
      toast({
        title: "OAuth Error",
        description: error.message || "Failed to initiate OAuth flow",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Check your email for the password reset link.",
      });
      
    } catch (error: any) {
      toast({
        title: "Error sending reset email",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isProcessingCallback,
        signIn,
        signUp,
        signOut,
        resetPassword,
        handleOAuthCallback,
        signInWithOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
