
import { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AnimatedButtonVariant = 
  | "default" 
  | "outline" 
  | "ghost" 
  | "secondary" 
  | "accent" 
  | "link" 
  | "destructive";

type AnimatedButtonSize = "sm" | "md" | "lg" | "icon";

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: AnimatedButtonVariant;
  size?: AnimatedButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const AnimatedButton = ({
  children,
  variant = "default",
  size = "md",
  isLoading = false,
  fullWidth = false,
  className,
  ...props
}: AnimatedButtonProps) => {
  // Base styles
  const baseStyles = "relative inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  // Size styles
  const sizeStyles = {
    sm: "h-8 rounded-md px-3 text-xs",
    md: "h-10 rounded-md px-4 text-sm",
    lg: "h-12 rounded-md px-6 text-base",
    icon: "h-10 w-10 rounded-md"
  };
  
  // Variant styles
  const variantStyles = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-sm",
    outline: "border border-input bg-background hover:bg-accent/10 hover:text-accent-foreground active:bg-accent/20",
    ghost: "hover:bg-accent/10 hover:text-accent-foreground active:bg-accent/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
    accent: "bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80 shadow-sm",
    link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 shadow-sm"
  };
  
  // Loading styles
  const loadingStyles = isLoading 
    ? "relative text-transparent transition-none hover:text-transparent" 
    : "";
  
  // Full width style
  const fullWidthStyle = fullWidth ? "w-full" : "";
  
  // Button animation
  const buttonAnimation = !props.disabled && !isLoading
    ? "after:absolute after:inset-0 after:rounded-md after:bg-white/0 hover:after:bg-white/10 after:transition-colors after:duration-300 after:ease-out-expo active:scale-[0.98] active:after:bg-white/0"
    : "";
  
  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        loadingStyles,
        fullWidthStyle,
        buttonAnimation,
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
        </div>
      )}
      {children}
    </button>
  );
};
