import React, { useState } from 'react';
import { cn } from '../../utils/cn';

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | undefined>(undefined);

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
  className,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange : setInternalOpen;

  return (
    <CollapsibleContext.Provider value={{ open: open ?? false, onOpenChange: onOpenChange || (() => {}) }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  );
};

export const CollapsibleContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  const context = React.useContext(CollapsibleContext);
  
  if (!context?.open) return null;

  return (
    <div className={cn('overflow-hidden', className)} {...props}>
      {children}
    </div>
  );
};

