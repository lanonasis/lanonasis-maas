import type { PrototypeMemory } from '../bridges/PrototypeUIBridge';
import type { LucideIcon } from 'lucide-react';
import {
  Terminal,
  FileCode,
  Hash,
  Calendar,
  Lightbulb,
  Briefcase,
  User,
  Settings,
} from 'lucide-react';

// Memory type compatible with prototype MemoryCard
export interface Memory {
  id: string;
  title: string;
  content: string;
  date: Date;
  tags: string[];
  icon: LucideIcon;
  type: string;
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  terminal: Terminal,
  filecode: FileCode,
  hash: Hash,
  calendar: Calendar,
  lightbulb: Lightbulb,
  briefcase: Briefcase,
  user: User,
  settings: Settings,
};

/**
 * Safely converts a date value to a Date object.
 * Handles:
 * - Date objects (pass through)
 * - ISO date strings (from JSON serialization via postMessage)
 * - Unix timestamps (numbers)
 * - Invalid/undefined values (returns current date as fallback)
 */
function safeParseDate(value: Date | string | number | undefined | null): Date {
  if (!value) {
    return new Date();
  }

  // Already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date() : value;
  }

  // String (ISO format from JSON serialization)
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  // Number (Unix timestamp)
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  return new Date();
}

// Helper to convert PrototypeMemory to Memory format
export function prototypeMemoryToMemory(proto: PrototypeMemory): Memory {
  // Safely handle edge cases from JSON serialization
  const safeProto = proto || {} as Partial<PrototypeMemory>;

  return {
    id: safeProto.id || `memory-${Date.now()}`,
    title: safeProto.title || 'Untitled Memory',
    content: safeProto.content || '',
    date: safeParseDate(safeProto.date),
    tags: Array.isArray(safeProto.tags) ? safeProto.tags : [],
    icon: iconMap[safeProto.iconType || ''] || Terminal,
    type: safeProto.type || 'context',
  };
}

