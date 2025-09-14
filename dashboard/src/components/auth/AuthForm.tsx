
import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedButton } from "../ui/AnimatedButton";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { supabase, getRedirectUrl } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GoogleIcon, GitHubIcon, LinkedInIcon, DiscordIcon, AppleIcon } from "../icons/social-providers";

type AuthMode = "login" | "register" | "forgot-password";

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (data: Record<string, string>) => void;
  isLoading?: boolean;
}

export const AuthForm = ({ mode, onSubmit, isLoading = false }: AuthFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate email
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    
    // Validate password for login and register
    if (mode !== "forgot-password") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }
    
    // Additional validations for register
    if (mode === "register") {
      if (!formData.name) {
        newErrors.name = "Name is required";
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
    }
  };

  // Form titles and button text based on mode
  const formConfig = {
    login: {
      title: "Welcome back",
      subtitle: "Sign in to your account",
      buttonText: "Sign in",
      footerText: "Don't have an account?",
      footerLinkText: "Create account",
      footerLinkPath: "/auth/register"
    },
    register: {
      title: "Create an account",
      subtitle: "Sign up for your account",
      buttonText: "Create account",
      footerText: "Already have an account?",
      footerLinkText: "Sign in",
      footerLinkPath: "/auth/login"
    },
    "forgot-password": {
      title: "Reset your password",
      subtitle: "We'll send you a reset link",
      buttonText: "Send reset link",
      footerText: "Remember your password?",
      footerLinkText: "Back to login",
      footerLinkPath: "/auth/login"
    }
  };

  const { title, subtitle, buttonText, footerText, footerLinkText, footerLinkPath } = formConfig[mode];

  const handleSocialLogin = async (provider: 'google' | 'github' | 'linkedin' | 'discord' | 'apple') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getRedirectUrl()}/dashboard`,
          scopes: provider === 'github' ? 'read:user user:email' : undefined,
        }
      });

      if (error) throw error;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to login with ${provider}`;
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-card shadow-subtle-md rounded-lg border border-gray-200/60 dark:border-gray-700/60 w-full max-w-md mx-auto overflow-hidden">
      <div className="p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field (Register only) */}
          {mode === "register" && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={cn(
                  "w-full px-3 py-2 border border-input rounded-md bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-all duration-300",
                  errors.name && "border-destructive focus:ring-destructive"
                )}
                placeholder="Full name"
              />
              {errors.name && (
                <p className="text-destructive text-xs mt-1">{errors.name}</p>
              )}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={cn(
                "w-full px-3 py-2 border border-input rounded-md bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-all duration-300",
                errors.email && "border-destructive focus:ring-destructive"
              )}
              placeholder="name@example.com"
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password Field (Login and Register) */}
          {mode !== "forgot-password" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                {mode === "login" && (
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={cn(
                    "w-full px-3 py-2 border border-input rounded-md bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-all duration-300",
                    errors.password && "border-destructive focus:ring-destructive"
                  )}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {/* Confirm Password Field (Register only) */}
          {mode === "register" && (
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={cn(
                    "w-full px-3 py-2 border border-input rounded-md bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-input transition-all duration-300",
                    errors.confirmPassword && "border-destructive focus:ring-destructive"
                  )}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <AnimatedButton
            type="submit"
            fullWidth
            isLoading={isLoading}
            className="mt-6"
          >
            {buttonText}
          </AnimatedButton>
        </form>

        {/* Social Auth (optional) */}
        {mode !== "forgot-password" && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {/* Primary providers - 2 columns */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm hover:bg-secondary transition-colors duration-300 disabled:opacity-50"
                >
                  <GoogleIcon />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('github')}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm hover:bg-secondary transition-colors duration-300 disabled:opacity-50"
                >
                  <GitHubIcon />
                  <span>GitHub</span>
                </button>
              </div>
              
              {/* Secondary providers - 3 columns */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('linkedin')}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm hover:bg-secondary transition-colors duration-300 disabled:opacity-50"
                >
                  <LinkedInIcon />
                  <span>LinkedIn</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('discord')}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm hover:bg-secondary transition-colors duration-300 disabled:opacity-50"
                >
                  <DiscordIcon />
                  <span>Discord</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm hover:bg-secondary transition-colors duration-300 disabled:opacity-50"
                >
                  <AppleIcon />
                  <span>Apple</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Text */}
        <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
          <div>
            <span>{footerText}</span>{" "}
            <Link to={footerLinkPath} className="text-primary hover:underline">
              {footerLinkText}
            </Link>
          </div>
          <div>
            <Link to="/landing" className="text-primary/70 hover:text-primary hover:underline">
              Learn more about LanOnasis Platform
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
