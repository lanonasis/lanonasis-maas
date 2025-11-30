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

// Helper to convert PrototypeMemory to Memory format
export function prototypeMemoryToMemory(proto: PrototypeMemory): Memory {
  return {
    id: proto.id,
    title: proto.title,
    content: proto.content,
    date: proto.date,
    tags: proto.tags,
    icon: iconMap[proto.iconType] || Terminal,
    type: proto.type,
  };
}

