import {
  addLocalDays,
  addLocalMonths,
  addLocalWeeks,
  atLocalTime,
  calendarDaysBetween,
  localDateToInstant,
  localIsoWeekday,
  startOfLocalDay,
  startOfLocalWeek,
  type TimeZone,
} from "@/lib/dates/zoned";
import type {
  FixedSchedule,
  IntervalSchedule,
  OneOffSchedule,
  ReminderConfig,
} from "./schedule";
import type { CompletionEvent, CompletionKind, RoutineSnapshot } from "./types";

const DAYS_PER_WEEK = 7;
const MS_PER_HOUR = 60 * 60 * 1000;
/** "Am Vorabend" reminders surface the routine from this local time the day before. */
export const EVENING_REMINDER_TIME = "18:00";

/** Events that count for scheduling: those after a "restart" anchor, if any. */
export function relevantEvents(
  routine: Pick<RoutineSnapshot, "rhythmAnchorAt">,
  events: readonly CompletionEvent[],
): CompletionEvent[] {
  const anchor = routine.rhythmAnchorAt;
  return anchor ? events.filter((e) => e.completedAt >= anchor) : [...events];
}

export function latestEvent(
  events: readonly CompletionEvent[],
  kinds: readonly CompletionKind[] = ["DONE", "SKIPPED"],
): Date | null {
  let latest: Date | null = null;
  for (const event of events) {
    if (!kinds.includes(event.kind)) continue;
    if (!latest || event.completedAt > latest) latest = event.completedAt;
  }
  return latest;
}

/** Start of the local day on which an interval routine is due again after `base`. */
export function addInterval(base: Date, schedule: IntervalSchedule, zone: TimeZone): Date {
  const day = startOfLocalDay(base, zone);
  switch (schedule.unit) {
    case "DAY":
      return addLocalDays(day, schedule.value, zone);
    case "WEEK":
      return addLocalWeeks(day, schedule.value, zone);
    case "MONTH":
      return addLocalMonths(day, schedule.value, zone);
  }
}

/**
 * Due date of an interval routine: last completion/skip + interval.
 * Without history it is due on its anchor (restart) + interval, or right away
 * on the day it was created.
 */
export function intervalDueDate(
  routine: Pick<RoutineSnapshot, "rhythmAnchorAt" | "createdAt">,
  schedule: IntervalSchedule,
  events: readonly CompletionEvent[],
  zone: TimeZone,
): Date {
  const lastHandled = latestEvent(relevantEvents(routine, events));
  if (lastHandled) return addInterval(lastHandled, schedule, zone);
  if (routine.rhythmAnchorAt) return addInterval(routine.rhythmAnchorAt, schedule, zone);
  return startOfLocalDay(routine.createdAt, zone);
}

export function oneOffDueAt(schedule: OneOffSchedule, zone: TimeZone): Date {
  const day = localDateToInstant(schedule.dueDate, zone);
  return schedule.dueTime ? atLocalTime(day, schedule.dueTime, zone) : day;
}

/** Earliest instant from which a routine due at `dueAt` should already be shown. */
export function reminderLeadStart(
  dueAt: Date,
  hasTime: boolean,
  reminder: ReminderConfig,
  zone: TimeZone,
): Date {
  const dueDay = startOfLocalDay(dueAt, zone);
  switch (reminder.offset) {
    case "NONE":
    case "AT_DUE":
      return dueDay;
    case "HOUR_BEFORE": {
      if (!hasTime) return dueDay;
      const hourBefore = new Date(dueAt.getTime() - MS_PER_HOUR);
      return hourBefore < dueDay ? hourBefore : dueDay;
    }
    case "EVENING_BEFORE":
      return atLocalTime(addLocalDays(dueDay, -1, zone), EVENING_REMINDER_TIME, zone);
    case "DAY_BEFORE":
      return addLocalDays(dueDay, -1, zone);
  }
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function fixedAnchorDay(
  routine: Pick<RoutineSnapshot, "createdAt">,
  schedule: FixedSchedule,
  zone: TimeZone,
): Date {
  return schedule.startDate
    ? localDateToInstant(schedule.startDate, zone)
    : startOfLocalDay(routine.createdAt, zone);
}

export function isFixedOccurrenceDay(
  day: Date,
  schedule: FixedSchedule,
  anchorDay: Date,
  zone: TimeZone,
): boolean {
  if (!schedule.weekdays.includes(localIsoWeekday(day, zone))) return false;
  if (schedule.everyNWeeks <= 1) return true;
  const weeks = Math.round(
    calendarDaysBetween(startOfLocalWeek(anchorDay, 1, zone), startOfLocalWeek(day, 1, zone), zone) /
      DAYS_PER_WEEK,
  );
  return positiveModulo(weeks, schedule.everyNWeeks) === 0;
}

export function fixedOccurrenceAt(day: Date, schedule: FixedSchedule, zone: TimeZone): Date {
  return schedule.time ? atLocalTime(day, schedule.time, zone) : startOfLocalDay(day, zone);
}

/**
 * Finds the first occurrence day starting at `from` (inclusive) moving in
 * `direction`. The search window covers every possible repeat pattern.
 */
export function findFixedOccurrence(
  from: Date,
  direction: 1 | -1,
  schedule: FixedSchedule,
  anchorDay: Date,
  zone: TimeZone,
  predicate: (day: Date) => boolean = () => true,
): Date | null {
  const searchDays = DAYS_PER_WEEK * schedule.everyNWeeks * 2 + DAYS_PER_WEEK;
  let day = startOfLocalDay(from, zone);
  for (let i = 0; i <= searchDays; i++) {
    if (isFixedOccurrenceDay(day, schedule, anchorDay, zone) && predicate(day)) return day;
    day = addLocalDays(day, direction, zone);
  }
  return null;
}
