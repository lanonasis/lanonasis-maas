import React from 'react';
import { cn } from '../../utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] px-3 py-2 text-sm text-[var(--vscode-input-foreground)] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--vscode-input-placeholderForeground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vscode-focusBorder)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };

