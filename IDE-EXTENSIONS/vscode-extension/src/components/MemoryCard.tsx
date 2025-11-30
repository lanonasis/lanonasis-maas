import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Copy, Check, Hash } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '../utils/cn';
import type { Memory } from '@/shared/types';

export interface MemoryCardProps {
  memory: Memory;
}

export const MemoryCard = ({ memory }: MemoryCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(memory.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'group relative flex flex-col gap-1.5 rounded-sm p-2 hover:bg-[var(--vscode-list-hoverBackground)] transition-colors duration-100 cursor-pointer border border-transparent hover:border-[var(--vscode-focusBorder)]',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`memory-card-${memory.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <memory.icon className="h-3.5 w-3.5 text-[var(--vscode-editor-foreground)] opacity-70 shrink-0" />
          <h3 className="text-[13px] text-[var(--vscode-editor-foreground)] leading-tight line-clamp-1">
            {memory.title}
          </h3>
        </div>
        {isHovered && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] -mt-0.5 -mr-1 shrink-0 rounded-sm"
            onClick={handleCopy}
            data-testid="btn-copy-memory"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[var(--vscode-descriptionForeground)] pl-5.5">
        <div className="flex items-center gap-1 opacity-60">
          <span data-testid="text-memory-date">
            {format(memory.date, 'MMM d')}
          </span>
        </div>
        {memory.tags.map(tag => (
          <div
            key={tag}
            className="flex items-center gap-0.5 px-1 rounded bg-[var(--vscode-badge-background)]/10 text-[var(--vscode-editor-foreground)] opacity-60"
            data-testid={`tag-${tag}`}
          >
            <Hash className="h-2.5 w-2.5" />
            <span>{tag}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
