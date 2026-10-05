import type { TimeZone } from "@/lib/dates/zoned";
import type { Priority, ReminderConfig, Schedule } from "./schedule";

export type { Priority, RoutineType, Schedule, ReminderConfig } from "./schedule";

export type CompletionKind = "DONE" | "SKIPPED";

/** The scheduling-relevant facts about a routine, independent of persistence. */
export interface RoutineSnapshot {
  id: string;
  title: string;
  priority: Priority;
  schedule: Schedule;
  reminder: ReminderConfig;
  isPaused: boolean;
  /** Completions before this instant are ignored ("Ab heute neu starten"). */
  rhythmAnchorAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;
}

export interface CompletionEvent {
  completedAt: Date;
  kind: CompletionKind;
}

export interface Clock {
  now: Date;
  timeZone: TimeZone;
}

export interface WeeklyProgress {
  completed: number;
  target: number;
  remaining: number;
  /** Days left in the week including today (1–7). */
  daysLeft: number;
  doneToday: boolean;
  achieved: boolean;
  /** Remaining sessions need every remaining day: should be done today. */
  urgent: boolean;
  /** Fewer sessions than the even pace for the elapsed days would suggest. */
  behind: boolean;
  weekStart: Date;
}

export type RoutineStatus =
  | { kind: "paused" }
  | { kind: "done"; completedAt: Date }
  | { kind: "overdue"; dueAt: Date; daysOverdue: number; hasTime: boolean }
  /** dayOffset 1 = due tomorrow but already shown because of the reminder lead. */
  | { kind: "due"; dueAt: Date; dayOffset: number; hasTime: boolean }
  | { kind: "upcoming"; dueAt: Date; daysUntil: number; hasTime: boolean }
  | { kind: "weekly"; progress: WeeklyProgress; snoozed: boolean }
  | { kind: "manual"; daysSince: number | null };

export interface RoutineState {
  status: RoutineStatus;
  lastDoneAt: Date | null;
  nextDueAt: Date | null;
}
