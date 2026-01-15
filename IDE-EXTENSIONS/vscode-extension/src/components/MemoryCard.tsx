import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { Copy, Check, Hash, Paperclip, MoreHorizontal, ExternalLink, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '../utils/cn';
import type { Memory } from '@/shared/types';

export interface MemoryCardProps {
  memory: Memory;
  onAttach?: (memory: Memory) => void;
  onCopy?: (memory: Memory) => void;
  onOpen?: (memory: Memory) => void;
  onDelete?: (memory: Memory) => void;
}

export const MemoryCard = ({ 
  memory, 
  onAttach,
  onCopy,
  onOpen,
  onDelete,
}: MemoryCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attached, setAttached] = useState(false);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopy) {
      onCopy(memory);
    } else {
      navigator.clipboard.writeText(memory.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [memory, onCopy]);

  const handleAttach = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAttach) {
      onAttach(memory);
      setAttached(true);
      setTimeout(() => setAttached(false), 1500);
    }
  }, [memory, onAttach]);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpen) {
      onOpen(memory);
    }
  }, [memory, onOpen]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(memory);
    }
  }, [memory, onDelete]);

  // Determine the icon to display
  const IconComponent = memory.icon;

  // Safely format the date - handles invalid dates gracefully
  const formattedDate = useMemo(() => {
    try {
      const date = memory.date instanceof Date ? memory.date : new Date(memory.date);
      if (!isValid(date)) {
        return 'Unknown';
      }
      return format(date, 'MMM d');
    } catch (e) {
      console.warn('[MemoryCard] Date formatting failed:', e);
      return 'Unknown';
    }
  }, [memory.date]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'group relative flex flex-col gap-1.5 rounded-sm p-2 hover:bg-[var(--vscode-list-hoverBackground)] transition-colors duration-100 cursor-pointer border border-transparent hover:border-[var(--vscode-focusBorder)]',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpen}
      data-testid={`memory-card-${memory.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {IconComponent && (
            <IconComponent className="h-3.5 w-3.5 text-[var(--vscode-editor-foreground)] opacity-70 shrink-0" />
          )}
          <h3 className="text-[13px] text-[var(--vscode-editor-foreground)] leading-tight line-clamp-1 flex-1">
            {memory.title}
          </h3>
        </div>
        
        {/* Action buttons - visible on hover */}
        <div className={cn(
          'flex items-center gap-0.5 transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}>
          {/* Attach to context button */}
          {onAttach && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] shrink-0 rounded-sm"
              onClick={handleAttach}
              title="Attach to chat context"
              data-testid="btn-attach-memory"
            >
              {attached ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
            </Button>
          )}
          
          {/* Copy button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] shrink-0 rounded-sm"
            onClick={handleCopy}
            title="Copy content"
            data-testid="btn-copy-memory"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] shrink-0 rounded-sm"
                onClick={(e) => e.stopPropagation()}
                data-testid="btn-memory-more"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[var(--vscode-menu-background)] border-[var(--vscode-panel-border)] text-[var(--vscode-menu-foreground)] min-w-[140px] p-1"
            >
              {onOpen && (
                <DropdownMenuItem
                  className="text-[12px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1"
                  onClick={handleOpen}
                >
                  <ExternalLink className="mr-2 h-3 w-3 opacity-70" />
                  Open
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-[12px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1"
                onClick={handleCopy}
              >
                <Copy className="mr-2 h-3 w-3 opacity-70" />
                Copy
              </DropdownMenuItem>
              {onAttach && (
                <DropdownMenuItem
                  className="text-[12px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1"
                  onClick={handleAttach}
                >
                  <Paperclip className="mr-2 h-3 w-3 opacity-70" />
                  Add to context
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                  <DropdownMenuItem
                    className="text-[12px] text-[var(--vscode-errorForeground)] hover:bg-[var(--vscode-menu-selectionBackground)] cursor-pointer rounded-sm px-2 py-1"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-3 w-3 opacity-70" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Preview of content on hover */}
      {isHovered && memory.content && (
        <div className="text-[11px] text-[var(--vscode-descriptionForeground)] pl-5.5 line-clamp-2 opacity-70">
          {memory.content.substring(0, 100)}...
        </div>
      )}
      
      {/* Metadata row */}
      <div className="flex items-center gap-3 text-[11px] text-[var(--vscode-descriptionForeground)] pl-5.5">
        <div className="flex items-center gap-1 opacity-60">
          <span data-testid="text-memory-date">
            {formattedDate}
          </span>
        </div>
        {memory.tags.slice(0, 3).map(tag => (
          <div
            key={tag}
            className="flex items-center gap-0.5 px-1 rounded bg-[var(--vscode-badge-background)]/10 text-[var(--vscode-editor-foreground)] opacity-60"
            data-testid={`tag-${tag}`}
          >
            <Hash className="h-2.5 w-2.5" />
            <span>{tag}</span>
          </div>
        ))}
        {memory.tags.length > 3 && (
          <span className="opacity-50">+{memory.tags.length - 3}</span>
        )}
      </div>
    </motion.div>
  );
};
