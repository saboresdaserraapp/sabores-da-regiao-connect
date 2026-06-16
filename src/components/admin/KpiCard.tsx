import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  tooltip?: string;
  icon?: LucideIcon;
  trend?: number;
  className?: string;
}

export function KpiCard({ label, value, hint, tooltip, icon: Icon, trend, className }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-shadow hover:shadow-md", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {Icon && <Icon className="size-3.5" />}
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/70 hover:text-foreground">
                  <Info className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </span>
        {typeof trend === "number" && (
          <span className={cn("text-[11px] font-medium", trend >= 0 ? "text-primary" : "text-destructive")}>
            {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-2 font-display text-2xl font-bold leading-none text-balance">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground text-pretty">{hint}</div>}
    </div>
  );
}
