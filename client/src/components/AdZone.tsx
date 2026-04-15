import { cn } from "@/lib/utils";

interface AdZoneProps {
  size?: "banner" | "leaderboard" | "rectangle" | "sidebar" | "inline";
  className?: string;
  label?: string;
}

const sizeConfig = {
  banner: { w: "w-full", h: "h-16 sm:h-20", label: "Advertisement Banner (728×90)" },
  leaderboard: { w: "w-full", h: "h-24", label: "Leaderboard Ad (970×90)" },
  rectangle: { w: "w-full max-w-[300px]", h: "h-[250px]", label: "Rectangle Ad (300×250)" },
  sidebar: { w: "w-full", h: "h-[600px]", label: "Sidebar Ad (300×600)" },
  inline: { w: "w-full", h: "h-20", label: "Inline Ad (468×60)" },
};

export default function AdZone({ size = "banner", className, label }: AdZoneProps) {
  const config = sizeConfig[size];
  return (
    <div
      className={cn(
        "ad-zone",
        config.w,
        config.h,
        className
      )}
      aria-label="Advertisement"
    >
      <span className="opacity-40">{label ?? config.label}</span>
    </div>
  );
}
