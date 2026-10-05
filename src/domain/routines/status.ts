import {
  addLocalDays,
  addLocalWeeks,
  calendarDaysBetween,
  isSameLocalDay,
  startOfLocalDay,
  startOfLocalWeek,
  type WeekStartsOn,
} from "@/lib/dates/zoned";
import type { FixedSchedule, ReminderConfig, WeeklyGoalSchedule } from "./schedule";
import {
  findFixedOccurrence,
  fixedAnchorDay,
  fixedOccurrenceAt,
  intervalDueDate,
  latestEvent,
  oneOffDueAt,
  relevantEvents,
  reminderLeadStart,
} from "./scheduling";
import type {
  Clock,
  CompletionEvent,
  RoutineSnapshot,
  RoutineState,
  RoutineStatus,
  WeeklyProgress,
} from "./types";

const DAYS_PER_WEEK = 7;

/** Status of something due at a specific day (and optional time). */
function datedStatus(
  dueAt: Date,
  hasTime: boolean,
  reminder: ReminderConfig,
  clock: Clock,
): RoutineStatus {
  const days = calendarDaysBetween(clock.now, dueAt, clock.timeZone);
  if (days < 0) return { kind: "overdue", dueAt, daysOverdue: -days, hasTime };
  if (days === 0) return { kind: "due", dueAt, dayOffset: 0, hasTime };
  if (clock.now >= reminderLeadStart(dueAt, hasTime, reminder, clock.timeZone)) {
    return { kind: "due", dueAt, dayOffset: days, hasTime };
  }
  return { kind: "upcoming", dueAt, daysUntil: days, hasTime };
}

export function calculateWeeklyProgress(
  schedule: WeeklyGoalSchedule,
  events: readonly CompletionEvent[],
  clock: Clock,
): WeeklyProgress {
  const zone = clock.timeZone;
  const weekStart = startOfLocalWeek(clock.now, schedule.weekStartsOn as WeekStartsOn, zone);
  const weekEnd = addLocalWeeks(weekStart, 1, zone);
  const done = events.filter(
    (e) => e.kind === "DONE" && e.completedAt >= weekStart && e.completedAt < weekEnd,
  );
  const completed = done.length;
  const target = schedule.targetCount;
  const remaining = Math.max(0, target - completed);
  const daysLeft = calendarDaysBetween(clock.now, weekEnd, zone);
  const elapsedDays = DAYS_PER_WEEK - daysLeft;
  const skippedToday = events.some(
    (e) => e.kind === "SKIPPED" && isSameLocalDay(e.completedAt, clock.now, zone),
  );
  return {
    completed,
    target,
    remaining,
    daysLeft,
    doneToday: done.some((e) => isSameLocalDay(e.completedAt, clock.now, zone)),
    achieved: remaining === 0,
    urgent: remaining > 0 && remaining >= daysLeft && !skippedToday,
    behind: remaining > 0 && completed < Math.floor((target * elapsedDays) / DAYS_PER_WEEK),
    weekStart,
  };
}

function fixedStatus(
  routine: RoutineSnapshot,
  schedule: FixedSchedule,
  events: readonly CompletionEvent[],
  clock: Clock,
): RoutineStatus {
  const zone = clock.timeZone;
  const anchorDay = fixedAnchorDay(routine, schedule, zone);
  const lastHandled = latestEvent(events);
  const hasTime = Boolean(schedule.time);
  const activeFrom = (day: Date) =>
    reminderLeadStart(fixedOccurrenceAt(day, schedule, zone), hasTime, routine.reminder, zone);
  const isHandled = (day: Date) => lastHandled !== null && lastHandled >= activeFrom(day);

  const today = startOfLocalDay(clock.now, zone);
  const next = findFixedOccurrence(today, 1, schedule, anchorDay, zone, (day) => !isHandled(day));
  const nextStatus = next
    ? datedStatus(fixedOccurrenceAt(next, schedule, zone), hasTime, routine.reminder, clock)
    : null;
  if (nextStatus && nextStatus.kind === "due") return nextStatus;

  // A missed occurrence stays visible until the next one becomes active.
  const firstEligibleDay = startOfLocalDay(routine.rhythmAnchorAt ?? routine.createdAt, zone);
  const previous = findFixedOccurrence(addLocalDays(today, -1, zone), -1, schedule, anchorDay, zone);
  if (previous && previous >= firstEligibleDay && !isHandled(previous)) {
    return {
      kind: "overdue",
      dueAt: fixedOccurrenceAt(previous, schedule, zone),
      daysOverdue: calendarDaysBetween(previous, today, zone),
      hasTime,
    };
  }
  return nextStatus ?? { kind: "manual", daysSince: null };
}

/** Moves a due/overdue status to the snooze day while the snooze applies. */
function applySnooze(status: RoutineStatus, snoozedUntil: Date | null, clock: Clock): RoutineStatus {
  if (!snoozedUntil) return status;
  const zone = clock.timeZone;
  const snoozeDay = startOfLocalDay(snoozedUntil, zone);
  if (status.kind === "weekly") {
    return clock.now < snoozeDay
      ? { ...status, snoozed: true, progress: { ...status.progress, urgent: false } }
      : status;
  }
  if (status.kind !== "due" && status.kind !== "overdue") return status;
  if (status.dueAt >= snoozeDay) return status;
  const days = calendarDaysBetween(clock.now, snoozeDay, zone);
  if (days > 0) return { kind: "upcoming", dueAt: snoozeDay, daysUntil: days, hasTime: false };
  if (days === 0) return { kind: "due", dueAt: snoozeDay, dayOffset: 0, hasTime: false };
  return { kind: "overdue", dueAt: snoozeDay, daysOverdue: -days, hasTime: false };
}

function baseStatus(
  routine: RoutineSnapshot,
  events: readonly CompletionEvent[],
  clock: Clock,
): RoutineStatus {
  const { schedule } = routine;
  const zone = clock.timeZone;
  switch (schedule.type) {
    case "INTERVAL":
      return datedStatus(
        intervalDueDate(routine, schedule, events, zone),
        false,
        routine.reminder,
        clock,
      );
    case "ONE_OFF": {
      // One-off tasks ignore restarts: any completion or skip finishes them.
      const handled = latestEvent(events);
      if (handled) return { kind: "done", completedAt: handled };
      return datedStatus(oneOffDueAt(schedule, zone), Boolean(schedule.dueTime), routine.reminder, clock);
    }
    case "FIXED_SCHEDULE":
      return fixedStatus(routine, schedule, relevantEvents(routine, events), clock);
    case "WEEKLY_GOAL":
      return {
        kind: "weekly",
        progress: calculateWeeklyProgress(schedule, relevantEvents(routine, events), clock),
        snoozed: false,
      };
    case "MANUAL": {
      const lastDone = latestEvent(events, ["DONE"]);
      return {
        kind: "manual",
        daysSince: lastDone ? calendarDaysBetween(lastDone, clock.now, zone) : null,
      };
    }
  }
}

export function calculateRoutineStatus(
  routine: RoutineSnapshot,
  events: readonly CompletionEvent[],
  clock: Clock,
): RoutineState {
  const lastDoneAt = latestEvent(events, ["DONE"]);
  if (routine.isPaused) return { status: { kind: "paused" }, lastDoneAt, nextDueAt: null };
  const status = applySnooze(baseStatus(routine, events, clock), routine.snoozedUntil, clock);
  const nextDueAt =
    status.kind === "due" || status.kind === "overdue" || status.kind === "upcoming"
      ? status.dueAt
      : null;
  return { status, lastDoneAt, nextDueAt };
}

/** Next recommended date (start of day or exact time), or null if not date-based. */
export function calculateNextDueDate(
  routine: RoutineSnapshot,
  events: readonly CompletionEvent[],
  clock: Clock,
): Date | null {
  return calculateRoutineStatus(routine, events, clock).nextDueAt;
}
