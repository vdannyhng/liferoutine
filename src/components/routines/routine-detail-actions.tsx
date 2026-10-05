"use client";

import { Check, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { de } from "@/lib/i18n/de";
import { deleteCompletionAction } from "@/server/routines/actions";
import type { HistoryEntryView } from "@/server/routines/queries";
import type { RoutineView } from "@/server/routines/view";
import { completeRoutine } from "./client-actions";
import { ResumeDialog } from "./routine-dialogs";
import { RoutineMenu } from "./routine-menu";

export function RoutineDetailActions({ routine }: { routine: RoutineView }) {
  const [pending, startTransition] = useTransition();
  const [resumeOpen, setResumeOpen] = useState(false);
  const complete = () => startTransition(async () => void (await completeRoutine(routine)));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {routine.isPaused ? (
        <>
          <Button onClick={() => setResumeOpen(true)}>
            <Play aria-hidden /> {de.actions.resume}
          </Button>
          <ResumeDialog routine={routine} open={resumeOpen} onOpenChange={setResumeOpen} />
        </>
      ) : (
        <Button onClick={complete} disabled={pending} className="min-w-36">
          <Check aria-hidden /> {de.actions.done}
        </Button>
      )}
      <Link href={`/routinen/${routine.id}/bearbeiten`} className={buttonVariants({ variant: "secondary" })}>
        <Pencil aria-hidden /> {de.actions.edit}
      </Link>
      <RoutineMenu routine={routine} onComplete={complete} afterDeleteHref="/routinen" />
    </div>
  );
}

export function CompletionHistory({ entries }: { entries: HistoryEntryView[] }) {
  const [toDelete, setToDelete] = useState<HistoryEntryView | null>(null);
  const [pending, startTransition] = useTransition();

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Einträge.</p>;
  }

  function confirmDelete() {
    if (!toDelete) return;
    startTransition(async () => {
      const result = await deleteCompletionAction({ completionId: toDelete.id });
      if (result.ok) {
        toast("Eintrag entfernt");
        setToDelete(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {entry.dateLabel}
                <span className="ml-2 font-normal text-muted-foreground">{entry.timeLabel}</span>
                {entry.kind === "SKIPPED" ? (
                  <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                    übersprungen
                  </span>
                ) : null}
              </p>
              {entry.durationMinutes || entry.note ? (
                <p className="truncate text-sm text-muted-foreground">
                  {[entry.durationMinutes ? `${entry.durationMinutes} Minuten` : null, entry.note]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eintrag vom ${entry.dateLabel} entfernen`}
              onClick={() => setToDelete(entry)}
              className="text-muted-foreground"
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent
          title="Eintrag entfernen?"
          description={toDelete ? `Der Eintrag vom ${toDelete.dateLabel} wird aus dem Verlauf entfernt.` : undefined}
        >
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              {de.actions.cancel}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              Entfernen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
