
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon?: ReactNode;
  change?: number;
  changeText?: string;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
  className?: string;
}

export const StatCard = ({
  title,
  value,
  icon,
  change,
  changeText,
  trend,
  isLoading = false,
  className,
}: StatCardProps) => {
  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border/60 p-5 transition-all duration-300 hover:shadow-subtle flex",
        className
      )}
    >
      {isLoading ? (
        <div className="animate-pulse w-full">
          <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-muted rounded w-2/3 mb-3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
        </div>
      ) : (
        <div className="flex flex-1 items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
            
            {(change !== undefined || changeText) && (
              <div className="mt-2 flex items-center">
                {trend && trend !== "neutral" && (
                  <span
                    className={cn(
                      "mr-1 flex items-center text-xs font-medium",
                      trend === "up" ? "text-emerald-500" : "text-rose-500"
                    )}
                  >
                    {trend === "up" ? (
                      <ArrowUpIcon className="mr-1 h-3 w-3" />
                    ) : (
                      <ArrowDownIcon className="mr-1 h-3 w-3" />
                    )}
                    {change && `${Math.abs(change)}%`}
                  </span>
                )}
                {changeText && (
                  <span className="text-xs text-muted-foreground">
                    {changeText}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {icon && (
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              {icon}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
