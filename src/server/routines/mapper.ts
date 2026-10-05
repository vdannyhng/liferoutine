import type { Routine, RoutineCompletion } from "@prisma/client";
import { parseReminder, parseSchedule } from "@/domain/routines/schedule";
import type { CompletionEvent, RoutineSnapshot } from "@/domain/routines/types";

/** Maps a database row to the domain snapshot; null if its schedule is corrupt. */
export function toSnapshot(row: Routine): RoutineSnapshot | null {
  const schedule = parseSchedule(row.scheduleConfig);
  if (!schedule) {
    console.error(`Routine ${row.id} has an invalid schedule and is ignored.`);
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    schedule,
    reminder: parseReminder(row.reminderConfig),
    isPaused: row.isPaused,
    rhythmAnchorAt: row.rhythmAnchorAt,
    snoozedUntil: row.snoozedUntil,
    createdAt: row.createdAt,
  };
}

export function toEvents(rows: Pick<RoutineCompletion, "completedAt" | "kind">[]): CompletionEvent[] {
  return rows.map((row) => ({ completedAt: row.completedAt, kind: row.kind }));
}
