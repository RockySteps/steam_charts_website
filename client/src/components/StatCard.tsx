import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: number;
  color?: "blue" | "teal" | "green" | "gold" | "red" | "purple";
  className?: string;
  loading?: boolean;
}

const colorMap = {
  blue: {
    icon: "text-[oklch(0.62_0.22_250)]",
    bg: "bg-[oklch(0.62_0.22_250/0.1)]",
    border: "border-[oklch(0.62_0.22_250/0.2)]",
    glow: "hover:shadow-[0_0_20px_oklch(0.62_0.22_250/0.15)]",
  },
  teal: {
    icon: "text-[oklch(0.7_0.18_195)]",
    bg: "bg-[oklch(0.7_0.18_195/0.1)]",
    border: "border-[oklch(0.7_0.18_195/0.2)]",
    glow: "hover:shadow-[0_0_20px_oklch(0.7_0.18_195/0.15)]",
  },
  green: {
    icon: "text-[oklch(0.72_0.2_145)]",
    bg: "bg-[oklch(0.72_0.2_145/0.1)]",
    border: "border-[oklch(0.72_0.2_145/0.2)]",
    glow: "hover:shadow-[0_0_20px_oklch(0.72_0.2_145/0.15)]",
  },
  gold: {
    icon: "text-[oklch(0.78_0.18_75)]",
    bg: "bg-[oklch(0.78_0.18_75/0.1)]",
    border: "border-[oklch(0.78_0.18_75/0.2)]",
    glow: "hover:shadow-[0_0_20px_oklch(0.78_0.18_75/0.15)]",
  },
  red: {
    icon: "text-[oklch(0.62_0.22_25)]",
    bg: "bg-[oklch(0.62_0.22_25/0.1)]",
    border: "border-[oklch(0.62_0.22_25/0.2)]",
    glow: "hover:shadow-[0_0_20px_oklch(0.62_0.22_25/0.15)]",
  },
  purple: {
    icon: "text-[oklch(0.62_0.22_295)]",
    bg: "bg-[oklch(0.62_0.22_295/0.1)]",
    border: "border-[oklch(0.62_0.22_295/0.2)]",
    glow: "hover:shadow-[0_0_20px_oklch(0.62_0.22_295/0.15)]",
  },
};

export default function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  color = "blue",
  className,
  loading = false,
}: StatCardProps) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-[oklch(0.18_0.015_260)] p-5 bg-[oklch(0.11_0.015_260)]", className)}>
        <div className="shimmer h-4 w-20 rounded mb-3" />
        <div className="shimmer h-8 w-32 rounded mb-2" />
        <div className="shimmer h-3 w-24 rounded" />
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border p-5 bg-[oklch(0.11_0.015_260)] transition-all duration-300",
      colors.border,
      colors.glow,
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-[oklch(0.55_0.02_260)] font-medium">{label}</p>
        {Icon && (
          <div className={cn("p-2 rounded-lg", colors.bg)}>
            <Icon className={cn("w-4 h-4", colors.icon)} />
          </div>
        )}
      </div>
      <p className={cn("text-2xl font-display font-bold tabular-nums", colors.icon)}>
        {value}
      </p>
      {(subValue || trend != null) && (
        <div className="mt-1 flex items-center gap-2">
          {subValue && <p className="text-xs text-[oklch(0.45_0.02_260)]">{subValue}</p>}
          {trend != null && (
            <span className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-[oklch(0.72_0.2_145)]" : trend < 0 ? "text-[oklch(0.62_0.22_25)]" : "text-[oklch(0.45_0.02_260)]"
            )}>
              {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
