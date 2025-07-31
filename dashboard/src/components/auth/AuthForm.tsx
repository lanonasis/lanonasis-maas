
import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedButton } from "../ui/AnimatedButton";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

type AuthMode = "login" | "register" | "forgot-password";

interface AuthFormProps {
  mode: AuthMode;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const AuthForm = ({ mode, onSubmit, isLoading = false }: AuthFormProps) => {
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

  return (
    <div className="bg-card shadow-subtle-md rounded-lg border border-border/60 w-full max-w-md mx-auto overflow-hidden">
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
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center space-x-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm hover:bg-secondary transition-colors duration-300"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Google</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center space-x-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm hover:bg-secondary transition-colors duration-300"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M9.03954 8.61024V11.5202H13.0749C12.8923 12.5673 11.9273 14.5806 9.03954 14.5806C6.56204 14.5806 4.56121 12.5514 4.56121 10C4.56121 7.44866 6.56204 5.41949 9.03954 5.41949C10.5054 5.41949 11.4863 6.05782 12.0282 6.57532L14.2845 4.38699C13.0036 3.18116 11.1986 2.42949 9.03954 2.42949C4.90454 2.42949 1.55371 5.78033 1.55371 10C1.55371 14.2197 4.90454 17.5705 9.03954 17.5705C13.3886 17.5705 16.0995 14.6939 16.0995 10.1984C16.0995 9.66699 16.0518 9.13949 15.9882 8.61033H9.03963L9.03954 8.61024Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M20.4591 8.60938H22.4436V10.5938H20.4591V12.5783H18.4745V10.5938H16.49V8.60938H18.4745V6.62493H20.4591V8.60938Z"
                    fill="#4285F4"
                  />
                </svg>
                <span>GitHub</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Text */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <span>{footerText}</span>{" "}
          <Link to={footerLinkPath} className="text-primary hover:underline">
            {footerLinkText}
          </Link>
        </div>
      </div>
    </div>
  );
};
