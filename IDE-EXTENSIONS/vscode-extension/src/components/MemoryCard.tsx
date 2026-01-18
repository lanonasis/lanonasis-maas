import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { Copy, Check, Hash, Paperclip, MoreHorizontal, ExternalLink, Trash2, Pencil, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '../utils/cn';
import type { Memory, MemoryUpdateInput } from '@/shared/types';

export interface MemoryCardProps {
  memory: Memory;
  onAttach?: (memory: Memory) => void;
  onCopy?: (memory: Memory) => void;
  onOpen?: (memory: Memory) => void;
  onDelete?: (memory: Memory) => void;
  onEdit?: (memory: Memory, updates: MemoryUpdateInput) => void;
  highlightQuery?: string;
  showRelevance?: boolean;
  typeLabel?: string;
}

export const MemoryCard = ({ 
  memory, 
  onAttach,
  onCopy,
  onOpen,
  onDelete,
  onEdit,
  highlightQuery,
  showRelevance = false,
  typeLabel,
}: MemoryCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attached, setAttached] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(memory.title);
  const [draftContent, setDraftContent] = useState(memory.content);
  const [draftTags, setDraftTags] = useState(memory.tags.join(', '));
  const isOpenable = Boolean(onOpen);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(memory.title);
      setDraftContent(memory.content);
      setDraftTags(memory.tags.join(', '));
    }
  }, [memory.content, memory.tags, memory.title, isEditing]);

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
    if (onOpen && !isEditing) {
      onOpen(memory);
    }
  }, [isEditing, memory, onOpen]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(memory);
    }
  }, [memory, onDelete]);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onEdit) return;
    setIsEditing(true);
    setIsExpanded(true);
  }, [onEdit]);

  const handleCancelEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setDraftTitle(memory.title);
    setDraftContent(memory.content);
    setDraftTags(memory.tags.join(', '));
  }, [memory.content, memory.tags, memory.title]);

  const handleSaveEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onEdit) return;
    const nextTags = draftTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const updates: MemoryUpdateInput = {};
    if (draftTitle.trim() && draftTitle !== memory.title) {
      updates.title = draftTitle.trim();
    }
    if (draftContent.trim() !== memory.content) {
      updates.content = draftContent.trim();
    }
    if (nextTags.join(',') !== memory.tags.join(',')) {
      updates.tags = nextTags;
    }
    if (Object.keys(updates).length > 0) {
      onEdit(memory, updates);
    }
    setIsEditing(false);
  }, [draftContent, draftTags, draftTitle, memory, onEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onOpen && !isEditing) {
        onOpen(memory);
      }
    }
  }, [isEditing, memory, onOpen]);

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

  const displayTypeLabel = useMemo(() => {
    if (typeLabel) return typeLabel;
    const trimmed = memory.type.trim();
    if (!trimmed) return 'Memory';
    return trimmed[0].toUpperCase() + trimmed.slice(1);
  }, [memory.type, typeLabel]);

  const statusLabel = useMemo(() => {
    if (!memory.status || memory.status === 'active') return null;
    const trimmed = memory.status.trim();
    if (!trimmed) return null;
    return trimmed[0].toUpperCase() + trimmed.slice(1);
  }, [memory.status]);

  const highlightText = useCallback((text: string, query: string, keyPrefix: string) => {
    const lower = text.toLowerCase();
    const parts: Array<string | JSX.Element> = [];
    let index = 0;
    let matchIndex = lower.indexOf(query, index);
    let key = 0;
    while (matchIndex !== -1) {
      if (matchIndex > index) {
        parts.push(text.slice(index, matchIndex));
      }
      parts.push(
        <mark
          key={`${keyPrefix}-${key}`}
          className="rounded-sm bg-[var(--vscode-editor-findMatchHighlightBackground)] px-0.5 text-[var(--vscode-editor-findMatchHighlightForeground)]"
        >
          {text.slice(matchIndex, matchIndex + query.length)}
        </mark>
      );
      key += 1;
      index = matchIndex + query.length;
      matchIndex = lower.indexOf(query, index);
    }
    if (index < text.length) {
      parts.push(text.slice(index));
    }
    return parts;
  }, []);

  const buildSnippet = useCallback((text: string, query: string, maxLength: number) => {
    if (!query) {
      return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    }
    const lower = text.toLowerCase();
    const matchIndex = lower.indexOf(query);
    if (matchIndex === -1) {
      return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    }
    const half = Math.floor((maxLength - query.length) / 2);
    const start = Math.max(0, matchIndex - half);
    const end = Math.min(text.length, start + maxLength);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    return `${prefix}${text.slice(start, end)}${suffix}`;
  }, []);

  const highlightedTitle = useMemo(() => {
    if (!highlightQuery || highlightQuery.trim().length < 2) {
      return memory.title;
    }
    const query = highlightQuery.trim().toLowerCase();
    return highlightText(memory.title, query, 'title');
  }, [highlightQuery, highlightText, memory.title]);

  const highlightedPreview = useMemo(() => {
    const query = highlightQuery?.trim().toLowerCase() || '';
    const snippet = buildSnippet(memory.content, query, 140);
    if (!query || query.length < 2) {
      return snippet;
    }
    return highlightText(snippet, query, 'preview');
  }, [buildSnippet, highlightQuery, highlightText, memory.content]);

  const highlightedContent = useMemo(() => {
    if (!highlightQuery || highlightQuery.trim().length < 2) {
      return memory.content;
    }
    const query = highlightQuery.trim().toLowerCase();
    return highlightText(memory.content, query, 'content');
  }, [highlightQuery, highlightText, memory.content]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'group relative flex flex-col gap-1.5 rounded-sm p-2 hover:bg-[var(--vscode-list-hoverBackground)] transition-colors duration-100 cursor-pointer border border-transparent hover:border-[var(--vscode-focusBorder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vscode-focusBorder)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--vscode-sideBar-background)]',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      data-testid={`memory-card-${memory.id}`}
      role={isOpenable && !isEditing ? 'button' : 'group'}
      tabIndex={isOpenable && !isEditing ? 0 : -1}
      aria-label={isOpenable && !isEditing ? `Open memory ${memory.title}` : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {IconComponent && (
            <IconComponent className="h-3.5 w-3.5 text-[var(--vscode-editor-foreground)] opacity-70 shrink-0" />
          )}
          <h3 className="text-[13px] text-[var(--vscode-editor-foreground)] leading-tight line-clamp-1 flex-1">
            {highlightedTitle}
          </h3>
        </div>
        
        {/* Action buttons - visible on hover */}
        <div className={cn(
          'flex items-center gap-0.5 transition-opacity',
          isHovered || isEditing ? 'opacity-100' : 'opacity-0'
        )}>
          {memory.content && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] shrink-0 rounded-sm"
              onClick={handleToggleExpand}
              title={isExpanded ? 'Collapse' : 'Expand'}
              aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
            >
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          )}
          {/* Attach to context button */}
          {onAttach && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] shrink-0 rounded-sm"
              onClick={handleAttach}
              title="Attach to chat context"
              aria-label="Attach to chat context"
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
            aria-label="Copy memory content"
            data-testid="btn-copy-memory"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>

          {onEdit && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] shrink-0 rounded-sm"
              onClick={handleStartEdit}
              title="Edit memory"
              aria-label="Edit memory"
              data-testid="btn-edit-memory"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[var(--vscode-errorForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] shrink-0 rounded-sm"
              onClick={handleDelete}
              title="Delete memory"
              aria-label="Delete memory"
              data-testid="btn-delete-memory"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] shrink-0 rounded-sm"
                onClick={(e) => e.stopPropagation()}
                data-testid="btn-memory-more"
                aria-label="More actions"
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isEditing ? (
        <div className="pl-5.5 pr-1 space-y-2">
          <input
            className="w-full rounded-sm border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] px-2 py-1 text-[12px] text-[var(--vscode-input-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vscode-focusBorder)]"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            aria-label="Edit memory title"
          />
          <textarea
            className="w-full min-h-[80px] rounded-sm border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] px-2 py-1 text-[12px] text-[var(--vscode-input-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vscode-focusBorder)]"
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            aria-label="Edit memory content"
          />
          <input
            className="w-full rounded-sm border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] px-2 py-1 text-[11px] text-[var(--vscode-input-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vscode-focusBorder)]"
            value={draftTags}
            onChange={(e) => setDraftTags(e.target.value)}
            aria-label="Edit memory tags"
            placeholder="tags, comma, separated"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={handleSaveEdit}
            >
              <Save className="mr-1 h-3 w-3" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={handleCancelEdit}
            >
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        memory.content && (
          <div className={cn(
            'text-[11px] text-[var(--vscode-descriptionForeground)] pl-5.5 opacity-80',
            isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
          )}>
            {isExpanded ? highlightedContent : highlightedPreview}
          </div>
        )
      )}

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--vscode-descriptionForeground)] pl-5.5">
        <span className="inline-flex items-center rounded-full bg-[var(--lanonasis-accent-soft)] px-2 py-0.5 text-[10px] text-[var(--lanonasis-accent-foreground)]">
          {displayTypeLabel}
        </span>
        {statusLabel && (
          <span className="inline-flex items-center rounded-full bg-[var(--vscode-badge-background)]/30 px-2 py-0.5 text-[10px] text-[var(--vscode-badge-foreground)]">
            {statusLabel}
          </span>
        )}
        <div className="flex items-center gap-1 opacity-60">
          <span data-testid="text-memory-date">
            {formattedDate}
          </span>
        </div>
        {showRelevance && typeof memory.similarityScore === 'number' && (
          <div className="flex items-center gap-1 opacity-70">
            <span>Match</span>
            <span>{Math.round(memory.similarityScore * 100)}%</span>
          </div>
        )}
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
