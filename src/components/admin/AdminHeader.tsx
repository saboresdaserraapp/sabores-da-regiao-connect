import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AdminHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-end justify-between gap-3 border-b border-border/70 bg-card/80 px-6 py-5 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground sm:max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
