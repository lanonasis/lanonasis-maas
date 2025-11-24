import React from "react";
import { format } from "date-fns";
import Badge from "./ui/Badge";
import { cn } from "../utils/cn";
import Icon from "./Icon";

// Memory types compatible with live extension
export interface MemoryCardProps {
  id: string;
  title: string;
  type: "conversation" | "knowledge" | "project" | "context" | "reference" | "personal" | "workflow";
  date: Date;
  tags: string[];
  content: string;
  iconType: 'terminal' | 'filecode' | 'hash' | 'calendar' | 'lightbulb' | 'briefcase' | 'user' | 'settings';
  onSelect?: () => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ id, title, type, date, tags, iconType, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border border-[#2D2D2D] bg-gradient-to-br from-[#252526] to-[#1E1E1E] p-3 hover:from-[#2A2D2E] hover:to-[#252526] hover:border-[#007ACC]/50 transition-all duration-200",
        onSelect && "cursor-pointer"
      )}
      data-testid={`memory-card-${id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#CCCCCC] leading-tight line-clamp-2">
          {title}
        </h3>
        <div className="scale-100 hover:scale-105 transition-transform">
          <Badge variant="outline" className="text-[8px] bg-[#007ACC]/10 border-[#007ACC]/30 text-[#007ACC]">
            {type}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-[#888888]">
        <div className="flex items-center gap-1">
          <Icon type={iconType} className="h-3 w-3" />
          <span>{format(date, "MMM d")}</span>
        </div>
        {tags.map((tag) => (
          <div key={tag} className="flex items-center gap-1 bg-[#007ACC]/10 px-1.5 py-0.5 rounded text-[#007ACC] text-[9px]">
            <span>#{tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryCard;
