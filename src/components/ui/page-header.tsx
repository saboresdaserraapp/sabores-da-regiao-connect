import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</div>
        ) : null}
        <h1 className="font-display text-2xl font-bold leading-tight text-balance sm:text-3xl">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground text-pretty sm:max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

interface SectionHeadingProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeading({ title, description, actions, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold sm:text-xl">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}