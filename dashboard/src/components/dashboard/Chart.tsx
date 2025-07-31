
import { useMemo } from "react";
import { DashboardCard } from "./DashboardCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";

type ChartType = "area" | "line" | "bar";

interface ChartProps {
  title?: string;
  subtitle?: string;
  data: any[];
  type?: ChartType;
  dataKeys: string[];
  xAxisDataKey: string;
  colors?: string[];
  isLoading?: boolean;
  className?: string;
  showGrid?: boolean;
  height?: number;
  headerAction?: React.ReactNode;
}

const defaultColors = ["#3f74e0", "#38bec9", "#36b37e", "#ff5630", "#6554c0", "#7c6bbd"];

export const Chart = ({
  title,
  subtitle,
  data,
  type = "area",
  dataKeys,
  xAxisDataKey,
  colors = defaultColors,
  isLoading = false,
  className,
  showGrid = true,
  height = 300,
  headerAction,
}: ChartProps) => {
  // Map colors to data keys
  const colorMap = useMemo(() => {
    return dataKeys.reduce((acc, key, index) => {
      acc[key] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [dataKeys, colors]);

  // Render appropriate chart based on type
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    switch (type) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(142, 142, 160, 0.1)" />
            )}
            <XAxis 
              dataKey={xAxisDataKey} 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: "rgba(142, 142, 160, 0.2)" }}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: "rgba(142, 142, 160, 0.2)" }}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--popover))", 
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
              }}
              itemStyle={{ padding: "4px 0" }}
            />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colorMap[key]}
                fill={`${colorMap[key]}20`}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        );
      case "line":
        return (
          <LineChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(142, 142, 160, 0.1)" />
            )}
            <XAxis 
              dataKey={xAxisDataKey} 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: "rgba(142, 142, 160, 0.2)" }}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: "rgba(142, 142, 160, 0.2)" }}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--popover))", 
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
              }}
              itemStyle={{ padding: "4px 0" }}
            />
            {dataKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colorMap[key]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        );
      case "bar":
        return (
          <BarChart {...commonProps}>
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(142, 142, 160, 0.1)" />
            )}
            <XAxis 
              dataKey={xAxisDataKey} 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: "rgba(142, 142, 160, 0.2)" }}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: "rgba(142, 142, 160, 0.2)" }}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--popover))", 
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
              }}
              itemStyle={{ padding: "4px 0" }}
            />
            {dataKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colorMap[key]}
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            ))}
          </BarChart>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      className={className}
      isLoading={isLoading}
      headerAction={headerAction}
    >
      <div className={cn("w-full", isLoading ? "opacity-50" : "")}>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
};
