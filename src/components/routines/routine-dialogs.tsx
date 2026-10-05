"use client";

import { useState, type FormEvent } from "react";
import { useClock } from "@/components/layout/clock-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { localDateToInstant } from "@/lib/dates/zoned";
import { de } from "@/lib/i18n/de";
import { formatDate } from "@/lib/i18n/format";
import { completeRoutine, deleteRoutine, resumeRoutine, snoozeRoutine } from "./client-actions";

interface RoutineDialogProps {
  routine: { id: string; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

/** "Anderes Datum": backdated completion with optional duration and note. */
export function CompleteDialog({ routine, open, onOpenChange, onDone }: RoutineDialogProps) {
  const { todayKey } = useClock();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const minutes = Number(form.get("duration"));
    setPending(true);
    const ok = await completeRoutine(routine, {
      date: String(form.get("date") || todayKey),
      durationMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      note: String(form.get("note") ?? "") || null,
    });
    setPending(false);
    if (ok) {
      onOpenChange(false);
      onDone?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${routine.title} erledigt`} description="Trage einen Abschluss für ein beliebiges Datum ein.">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Erledigt am" htmlFor="complete-date">
            <Input id="complete-date" name="date" type="date" defaultValue={todayKey} max={todayKey} required />
          </Field>
          <Field label="Dauer in Minuten (optional)" htmlFor="complete-duration">
            <Input id="complete-duration" name="duration" type="number" inputMode="numeric" min={1} max={1440} />
          </Field>
          <Field label="Notiz (optional)" htmlFor="complete-note">
            <Textarea id="complete-note" name="note" maxLength={500} placeholder="z. B. Beine" />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {de.actions.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {de.actions.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const SNOOZE_PRESETS = [
  { days: 1, label: "Morgen" },
  { days: 2, label: "Übermorgen" },
  { days: 7, label: "In einer Woche" },
] as const;

export function SnoozeDialog({ routine, open, onOpenChange, onDone }: RoutineDialogProps) {
  const { dayFromToday, timeZone } = useClock();
  const [pending, setPending] = useState(false);
  const tomorrow = dayFromToday(1);

  async function snooze(until: string) {
    setPending(true);
    const ok = await snoozeRoutine(routine, until, formatDate(localDateToInstant(until, timeZone), timeZone, "long"));
    setPending(false);
    if (ok) {
      onOpenChange(false);
      onDone?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${routine.title} verschieben`} description="Bis wann soll die Routine warten?">
        <div className="grid gap-2">
          {SNOOZE_PRESETS.map((preset) => (
            <Button key={preset.days} variant="secondary" disabled={pending} onClick={() => snooze(dayFromToday(preset.days))}>
              {preset.label}
            </Button>
          ))}
        </div>
        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("until");
            if (value) void snooze(String(value));
          }}
        >
          <Field label="Anderer Tag" htmlFor="snooze-date" className="flex-1">
            <Input id="snooze-date" name="until" type="date" min={tomorrow} defaultValue={tomorrow} required />
          </Field>
          <Button type="submit" disabled={pending}>
            {de.actions.snooze}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResumeDialog({ routine, open, onOpenChange, onDone }: RoutineDialogProps) {
  const [pending, setPending] = useState(false);

  async function resume(mode: "continue" | "restart") {
    setPending(true);
    const ok = await resumeRoutine(routine, mode);
    setPending(false);
    if (ok) {
      onOpenChange(false);
      onDone?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`${routine.title} fortsetzen`} description="Wie soll es weitergehen?">
        <div className="grid gap-2">
          <Button disabled={pending} onClick={() => resume("continue")}>
            Rhythmus fortsetzen
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => resume("restart")}>
            Ab heute neu starten
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          „Rhythmus fortsetzen“ rechnet ab dem letzten Abschluss weiter. „Ab heute neu starten“ beginnt den Rhythmus
          heute neu.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({ routine, open, onOpenChange, onDone }: RoutineDialogProps) {
  const [pending, setPending] = useState(false);
  const [deleteHistory, setDeleteHistory] = useState(false);

  async function remove() {
    setPending(true);
    const ok = await deleteRoutine(routine, deleteHistory);
    setPending(false);
    if (ok) {
      onOpenChange(false);
      onDone?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Routine löschen?" description={`„${routine.title}“ wird entfernt.`}>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[var(--destructive)]"
            checked={deleteHistory}
            onChange={(event) => setDeleteHistory(event.target.checked)}
          />
          Bisherige Historie ebenfalls entfernen
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          Ohne Haken bleiben vergangene Einträge im Verlauf sichtbar.
        </p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {de.actions.cancel}
          </Button>
          <Button variant="destructive" disabled={pending} onClick={remove}>
            {de.actions.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
