import { CircleAlert, CircleCheck, Clock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { StatusTone } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-card", className)}>{children}</div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-muted", className)} aria-hidden />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function SectionHeading({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
      {count !== undefined ? (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium normal-case">{count}</span>
      ) : null}
    </h2>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-surface-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

const TONE_STYLES: Record<StatusTone, { className: string; icon: LucideIcon | null }> = {
  overdue: { className: "text-overdue", icon: CircleAlert },
  today: { className: "text-today", icon: Clock },
  done: { className: "text-done", icon: CircleCheck },
  neutral: { className: "text-muted-foreground", icon: null },
};

/** Status text with color + icon, so state is never conveyed by color alone. */
export function StatusLine({ tone, label, className }: { tone: StatusTone; label: string; className?: string }) {
  const style = TONE_STYLES[tone];
  const Icon = style.icon;
  return (
    <p className={cn("flex items-center gap-1.5 text-sm font-medium", style.className, className)}>
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      <span>{label}</span>
    </p>
  );
}

/** ● ● ○ progress for weekly goals, with an accessible text alternative. */
export function ProgressDots({ completed, target }: { completed: number; target: number }) {
  const shown = Math.max(target, completed);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" role="img" aria-label={`${completed} von ${target}`}>
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2.5 rounded-full border",
            i < completed ? "border-done bg-done" : "border-muted-foreground/50 bg-transparent",
          )}
        />
      ))}
    </span>
  );
}

export function Chip({
  active,
  children,
  ...props
}: { active: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface text-foreground hover:bg-surface-muted",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
