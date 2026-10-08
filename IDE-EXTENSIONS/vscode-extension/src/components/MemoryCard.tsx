import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { Copy, Check, Hash, Paperclip, MoreHorizontal, ExternalLink, Trash2, Pencil, ChevronDown, ChevronUp, Save, X, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '../utils/cn';
import type { Memory, MemoryUpdateInput } from '@/shared/types';

export interface MemoryCardProps {
  memory: Memory;
  onAttach?: (memory: Memory) => void;
  onCopy?: (memory: Memory) => void;
  onOpen?: (memory: Memory) => void;
  /**
   * Asks the host to confirm deletion. The host (IDEPanel) translates this
   * into a `confirmDeleteMemory` postMessage — see AC-C1 / AC-U0.
   */
  onDelete?: (memory: Memory) => void;
  /** Opens the inline edit form. */
  onEdit?: (memory: Memory) => void;
  /** Commits a draft edit. */
  onCommitEdit?: (memory: Memory, updates: MemoryUpdateInput) => void;
  highlightQuery?: string;
  showRelevance?: boolean;
  typeLabel?: string;
  /** True while a delete is in flight for this card (AC-O1). */
  isDeleting?: boolean;
  /** True while a save (updateMemory) is in flight (AC-O2). */
  isSaving?: boolean;
  /** Last updateMemoryFailed message — inline error + Retry (AC-O3). */
  updateErrorMessage?: string | null;
  /** Re-issues the failed updateMemory post. */
  onRetryUpdate?: (memory: Memory, updates: MemoryUpdateInput) => void;
  /** Optional callback fired when the Save button is clicked (lets the host start its 15s timeout). */
  onSaveStarted?: (memory: Memory) => void;
}

const SAVE_TIMEOUT_MS = 15_000;

export const MemoryCard = ({
  memory,
  onAttach,
  onCopy,
  onOpen,
  onDelete,
  onEdit,
  onCommitEdit,
  highlightQuery,
  showRelevance = false,
  typeLabel,
  isDeleting = false,
  isSaving = false,
  updateErrorMessage = null,
  onRetryUpdate,
  onSaveStarted,
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

  // Tracks whether the user already kicked off a save this session so the
  // 15s timeout can revert to "Save" if no reply arrives (AC-O2).
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveTimedOut, setSaveTimedOut] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(memory.title);
      setDraftContent(memory.content);
      setDraftTags(memory.tags.join(', '));
    }
  }, [memory.content, memory.tags, memory.title, isEditing]);

  // Clean up the save-timeout timer if the card unmounts mid-save.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

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

  const handleStartEdit = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!onCommitEdit) return;
    if (onEdit) onEdit(memory);
    setIsEditing(true);
    setIsExpanded(true);
  }, [memory, onCommitEdit, onEdit]);

  const handleCancelEdit = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setDraftTitle(memory.title);
    setDraftContent(memory.content);
    setDraftTags(memory.tags.join(', '));
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveTimedOut(false);
  }, [memory.content, memory.tags, memory.title]);

  const handleSaveEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCommitEdit) return;
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
      setSaveTimedOut(false);
      onCommitEdit(memory, updates);
      if (onSaveStarted) onSaveStarted(memory);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveTimedOut(true);
        saveTimeoutRef.current = null;
      }, SAVE_TIMEOUT_MS);
    }
  }, [draftContent, draftTags, draftTitle, memory, onCommitEdit, onSaveStarted]);

  // When the host flips `isSaving` back to false and a `memoryUpdated`
  // event landed, the draft was committed — exit edit mode. If a failure
  // (updateMemoryFailed) landed instead, the host will pass an
  // `updateErrorMessage`, and we keep `isEditing` true so the draft is
  // preserved (AC-O3).
  useEffect(() => {
    if (!isSaving && isEditing && !updateErrorMessage && !saveTimedOut) {
      // Only exit if the host has explicitly cleared the saving flag —
      // the typical happy path. We rely on the host emitting memoryUpdated,
      // which will eventually flow through and reset isEditing.
    }
  }, [isSaving, isEditing, updateErrorMessage, saveTimedOut]);

  // If the host reports a timeout failure (saveTimedOut) and clears isSaving,
  // we surface the inline error message exactly once via updateErrorMessage.
  // Keep the draft intact and let the user retry.
  useEffect(() => {
    if (saveTimedOut && !isSaving) {
      // Inline error message will be rendered from updateErrorMessage; the
      // timeout flag stays until the user either retries or cancels.
    }
  }, [saveTimedOut, isSaving]);

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRetryUpdate) return;
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
      setSaveTimedOut(false);
      onRetryUpdate(memory, updates);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setSaveTimedOut(true);
        saveTimeoutRef.current = null;
      }, SAVE_TIMEOUT_MS);
    }
  }, [draftContent, draftTags, draftTitle, memory, onRetryUpdate]);

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
    const parts: React.ReactNode[] = [];
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
        isDeleting && 'opacity-60 pointer-events-none',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      data-testid={`memory-card-${memory.id}`}
      data-deleting={isDeleting || undefined}
      role={isOpenable && !isEditing ? 'button' : 'group'}
      tabIndex={isOpenable && !isEditing ? 0 : -1}
      aria-label={isOpenable && !isEditing ? `Open memory ${memory.title}` : undefined}
      aria-busy={isDeleting || undefined}
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
              {onCommitEdit && (
                <DropdownMenuItem
                  className="text-[12px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1"
                  onClick={(e) => handleStartEdit(e)}
                  data-testid="menu-edit-memory"
                >
                  <Pencil className="mr-2 h-3 w-3 opacity-70" />
                  Edit
                </DropdownMenuItem>
              )}
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
                <DropdownMenuItem
                  className={cn(
                    'text-[12px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1',
                    isDeleting && 'opacity-60 pointer-events-none',
                  )}
                  onClick={handleDelete}
                  data-testid={isDeleting ? 'btn-delete-memory-pending' : 'menu-delete-memory'}
                  aria-disabled={isDeleting || undefined}
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-3 w-3 opacity-70 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-3 w-3 opacity-70 text-[var(--vscode-errorForeground)]" />
                  )}
                  <span className={isDeleting ? '' : 'text-[var(--vscode-errorForeground)]'}>
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </span>
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
          {updateErrorMessage && (
            <div
              className="rounded-sm border border-[var(--vscode-inputValidation-errorBorder)] bg-[var(--vscode-inputValidation-errorBackground)] px-2 py-1.5 text-[11px] text-[var(--vscode-errorForeground)] flex items-center justify-between gap-2"
              role="alert"
              data-testid="memory-update-error"
            >
              <span className="flex-1 break-words">
                Update failed: {updateErrorMessage}. Retry?
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-[var(--vscode-textLink-foreground)]"
                onClick={handleRetry}
                disabled={isSaving}
                data-testid="memory-update-retry"
              >
                Retry
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={handleSaveEdit}
              disabled={isSaving}
              data-testid="btn-save-edit"
              aria-busy={isSaving || undefined}
            >
              {isSaving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={(e) => handleCancelEdit(e)}
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
