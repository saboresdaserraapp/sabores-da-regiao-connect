import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  label?: string;
  className?: string;
  variant?: "spinner" | "page" | "inline";
}

export function LoadingState({ label = "Carregando...", className, variant = "spinner" }: LoadingStateProps) {
  if (variant === "page") {
    return (
      <div className={cn("flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground", className)}>
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-sm">{label}</span>
      </div>
    );
  }
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="size-4 animate-spin" />
        {label}
      </span>
    );
  }
  return (
    <div className={cn("flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground", className)}>
      <Loader2 className="size-5 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}

interface SkeletonListProps {
  rows?: number;
  className?: string;
}

export function SkeletonList({ rows = 4, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  className?: string;
}

export function SkeletonGrid({ count = 6, className }: SkeletonGridProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}