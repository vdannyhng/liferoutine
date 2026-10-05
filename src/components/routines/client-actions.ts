"use client";

import { toast } from "sonner";
import { de } from "@/lib/i18n/de";
import type { ActionResult } from "@/server/errors";
import {
  completeRoutineAction,
  deleteRoutineAction,
  pauseRoutineAction,
  resumeRoutineAction,
  skipRoutineAction,
  snoozeRoutineAction,
  undoCompletionAction,
} from "@/server/routines/actions";

/** Undo stays available this long (spec: "mindestens einige Sekunden"). */
const UNDO_TOAST_MS = 8000;

interface RoutineRef {
  id: string;
  title: string;
}

export interface CompletionDetails {
  date?: string;
  durationMinutes?: number | null;
  note?: string | null;
}

/** Calls a server action and turns network failures into a friendly result. */
async function call<T>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await action();
  } catch {
    return { ok: false, error: navigator.onLine ? de.errors.generic : de.toast.offline };
  }
}

function showError(error: string, retry?: () => void) {
  toast.error(error, retry ? { action: { label: de.actions.retry, onClick: retry } } : undefined);
}

async function undo(completionId: string) {
  const result = await call(() => undoCompletionAction({ completionId }));
  if (result.ok) toast(de.toast.undone);
  else showError(result.error);
}

export async function completeRoutine(routine: RoutineRef, details: CompletionDetails = {}): Promise<boolean> {
  const result = await call(() => completeRoutineAction({ routineId: routine.id, ...details }));
  if (!result.ok) {
    showError(result.error, () => void completeRoutine(routine, details));
    return false;
  }
  toast.success(de.toast.completed(routine.title), {
    duration: UNDO_TOAST_MS,
    action: { label: de.actions.undo, onClick: () => void undo(result.data.completionId) },
  });
  return true;
}

export async function skipRoutine(routine: RoutineRef): Promise<boolean> {
  const result = await call(() => skipRoutineAction({ routineId: routine.id }));
  if (!result.ok) {
    showError(result.error);
    return false;
  }
  toast(de.toast.skipped(routine.title), {
    duration: UNDO_TOAST_MS,
    action: { label: de.actions.undo, onClick: () => void undo(result.data.completionId) },
  });
  return true;
}

export async function snoozeRoutine(routine: RoutineRef, until: string, untilLabel: string): Promise<boolean> {
  const result = await call(() => snoozeRoutineAction({ routineId: routine.id, until }));
  if (!result.ok) {
    showError(result.error);
    return false;
  }
  toast(de.toast.snoozed(routine.title, untilLabel));
  return true;
}

export async function pauseRoutine(routine: RoutineRef): Promise<boolean> {
  const result = await call(() => pauseRoutineAction({ routineId: routine.id }));
  if (!result.ok) {
    showError(result.error);
    return false;
  }
  toast(de.toast.paused(routine.title));
  return true;
}

export async function resumeRoutine(routine: RoutineRef, mode: "continue" | "restart"): Promise<boolean> {
  const result = await call(() => resumeRoutineAction({ routineId: routine.id, mode }));
  if (!result.ok) {
    showError(result.error);
    return false;
  }
  toast(de.toast.resumed(routine.title));
  return true;
}

export async function deleteRoutine(routine: RoutineRef, deleteHistory: boolean): Promise<boolean> {
  const result = await call(() => deleteRoutineAction({ routineId: routine.id, deleteHistory }));
  if (!result.ok) {
    showError(result.error);
    return false;
  }
  toast(de.toast.deleted(routine.title));
  return true;
}
