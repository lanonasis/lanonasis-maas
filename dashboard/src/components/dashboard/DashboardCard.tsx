
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  isLoading?: boolean;
  fullHeight?: boolean;
}

export const DashboardCard = ({
  title,
  subtitle,
  children,
  className,
  headerAction,
  isLoading = false,
  fullHeight = false,
}: DashboardCardProps) => {
  return (
    <div 
      className={cn(
        "bg-card rounded-lg border border-border/60 transition-all duration-300 hover:shadow-subtle",
        fullHeight && "h-full",
        className
      )}
    >
      {/* Card Header */}
      {(title || subtitle || headerAction) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-border/60">
          <div>
            {title && (
              <h3 className="text-base font-medium leading-6 text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && (
            <div className="mt-3 sm:mt-0">{headerAction}</div>
          )}
        </div>
      )}

      {/* Card Content */}
      <div className={cn("p-5", isLoading && "opacity-60")}>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[100px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
