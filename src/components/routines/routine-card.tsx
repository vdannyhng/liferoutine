"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon";
import { ProgressDots, StatusLine } from "@/components/ui/misc";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import type { RoutineView } from "@/server/routines/view";
import { RoutineMenu } from "./routine-menu";

interface RoutineCardProps {
  routine: RoutineView;
  /** Completions in flight (optimistic UI). */
  pendingCount?: number;
  onComplete: (routine: RoutineView) => void;
}

export function RoutineCard({ routine, pendingCount = 0, onComplete }: RoutineCardProps) {
  const weekly = routine.weekly
    ? { completed: routine.weekly.completed + pendingCount, target: routine.weekly.target }
    : null;
  const weeklyAchieved = weekly ? weekly.completed >= weekly.target : false;
  const statusTone = weeklyAchieved ? "done" : routine.tone;
  const statusLabel = weeklyAchieved ? de.status.weeklyAchieved : routine.statusLabel;

  return (
    <article
      className="rounded-2xl border border-border bg-surface p-4 shadow-card"
      aria-labelledby={`routine-${routine.id}-title`}
    >
      <div className="flex items-start gap-3">
        <IconTile name={routine.icon} />
        <div className="min-w-0 flex-1">
          <h3 id={`routine-${routine.id}-title`} className="truncate font-semibold">
            <Link href={`/routinen/${routine.id}`} className="hover:underline">
              {routine.title}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {[routine.categoryName, routine.scheduleLabel].filter(Boolean).join(" · ")}
          </p>
        </div>
        <RoutineMenu routine={routine} onComplete={() => onComplete(routine)} className="-mt-2 -mr-2" />
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          {weekly ? (
            <div className="flex items-center gap-2.5">
              <ProgressDots completed={weekly.completed} target={weekly.target} />
              <span className="text-sm text-muted-foreground">
                {de.status.weeklyProgress(weekly.completed, weekly.target)}
              </span>
            </div>
          ) : null}
          <StatusLine tone={statusTone} label={statusLabel} />
          {!weekly && routine.type !== "ONE_OFF" ? (
            <p className="text-sm text-muted-foreground">{routine.lastDoneLabel}</p>
          ) : null}
        </div>
        <Button
          onClick={() => onComplete(routine)}
          className={cn("min-w-32", pendingCount > 0 && "animate-[pop_250ms_ease-out]")}
          aria-label={`${routine.title}: ${de.actions.done}`}
        >
          <Check aria-hidden /> {de.actions.done}
        </Button>
      </div>
    </article>
  );
}

/** Compact row for "Demnächst" and the routine list. */
export function RoutineRow({
  routine,
  detail,
  onComplete,
}: {
  routine: RoutineView;
  detail: string;
  onComplete: (routine: RoutineView) => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <IconTile name={routine.icon} className="size-9" />
      <Link href={`/routinen/${routine.id}`} className="min-w-0 flex-1 rounded-lg py-1 hover:underline">
        <span className="block truncate font-medium">{routine.title}</span>
        <span className="block truncate text-sm text-muted-foreground">{detail}</span>
      </Link>
      {!routine.isPaused ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onComplete(routine)}
          aria-label={`${routine.title}: ${de.actions.done}`}
          className="text-muted-foreground hover:text-done"
        >
          <Check className="!size-5" aria-hidden />
        </Button>
      ) : null}
      <RoutineMenu routine={routine} onComplete={() => onComplete(routine)} />
    </li>
  );
}
