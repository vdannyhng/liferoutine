"use client";

import {
  CalendarClock,
  CalendarDays,
  Check,
  EllipsisVertical,
  Pause,
  Pencil,
  Play,
  SkipForward,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RoutineType } from "@/domain/routines/schedule";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { pauseRoutine, skipRoutine } from "./client-actions";
import { CompleteDialog, DeleteDialog, ResumeDialog, SnoozeDialog } from "./routine-dialogs";

type OpenDialog = "complete" | "snooze" | "resume" | "delete" | null;

interface RoutineMenuProps {
  routine: { id: string; title: string; isPaused: boolean; type: RoutineType };
  onComplete: () => void;
  /** Where to go after deleting (e.g. away from a detail page). */
  afterDeleteHref?: string;
  className?: string;
}

export function RoutineMenu({ routine, onComplete, afterDeleteHref, className }: RoutineMenuProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const setOpen = (name: Exclude<OpenDialog, null>) => (open: boolean) => setDialog(open ? name : null);
  // Flexible routines have no due date to move or skip.
  const isScheduled = routine.type !== "MANUAL";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted",
            className,
          )}
          aria-label={`${de.actions.more}: ${routine.title}`}
        >
          <EllipsisVertical className="size-5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!routine.isPaused ? (
            <>
              <DropdownMenuItem onSelect={onComplete}>
                <Check aria-hidden /> {de.actions.doneToday}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("complete")}>
                <CalendarDays aria-hidden /> {de.actions.otherDate}
              </DropdownMenuItem>
              {isScheduled ? (
                <>
                  <DropdownMenuItem onSelect={() => setDialog("snooze")}>
                    <CalendarClock aria-hidden /> {de.actions.snooze}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void skipRoutine(routine)}>
                    <SkipForward aria-hidden /> {de.actions.skip}
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onSelect={() => router.push(`/routinen/${routine.id}/bearbeiten`)}>
            <Pencil aria-hidden /> {de.actions.edit}
          </DropdownMenuItem>
          {routine.isPaused ? (
            <DropdownMenuItem onSelect={() => setDialog("resume")}>
              <Play aria-hidden /> {de.actions.resume}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => void pauseRoutine(routine)}>
              <Pause aria-hidden /> {de.actions.pause}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem destructive onSelect={() => setDialog("delete")}>
            <Trash2 aria-hidden /> {de.actions.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CompleteDialog routine={routine} open={dialog === "complete"} onOpenChange={setOpen("complete")} />
      <SnoozeDialog routine={routine} open={dialog === "snooze"} onOpenChange={setOpen("snooze")} />
      <ResumeDialog routine={routine} open={dialog === "resume"} onOpenChange={setOpen("resume")} />
      <DeleteDialog
        routine={routine}
        open={dialog === "delete"}
        onOpenChange={setOpen("delete")}
        onDone={afterDeleteHref ? () => router.push(afterDeleteHref) : undefined}
      />
    </>
  );
}
