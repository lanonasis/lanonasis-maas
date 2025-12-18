import React from 'react';
import { cn } from '../../utils/cn';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn('overflow-auto', className)}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--vscode-scrollbarSlider-background) var(--vscode-scrollbarSlider-hoverBackground)',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

