import {
  addLocalDays,
  addLocalWeeks,
  calendarDaysBetween,
  startOfLocalWeek,
  type WeekStartsOn,
} from "@/lib/dates/zoned";
import type { WeeklyGoalSchedule } from "./schedule";
import type { Clock, CompletionEvent } from "./types";

export interface WeekResult {
  weekStart: Date;
  completed: number;
  target: number;
}

/** Completions per week for the current and previous weeks (newest first). */
export function weeklyHistory(
  schedule: WeeklyGoalSchedule,
  events: readonly CompletionEvent[],
  clock: Clock,
  weeks: number,
): WeekResult[] {
  const zone = clock.timeZone;
  const currentWeek = startOfLocalWeek(clock.now, schedule.weekStartsOn as WeekStartsOn, zone);
  const done = events.filter((e) => e.kind === "DONE");
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addLocalWeeks(currentWeek, -index, zone);
    const weekEnd = addLocalWeeks(weekStart, 1, zone);
    return {
      weekStart,
      completed: done.filter((e) => e.completedAt >= weekStart && e.completedAt < weekEnd).length,
      target: schedule.targetCount,
    };
  });
}

/** Average number of calendar days between consecutive completions. */
export function averageGapDays(events: readonly CompletionEvent[], clock: Clock): number | null {
  const times = events
    .filter((e) => e.kind === "DONE")
    .map((e) => e.completedAt)
    .sort((a, b) => a.getTime() - b.getTime());
  if (times.length < 2) return null;
  let total = 0;
  for (let i = 1; i < times.length; i++) {
    total += calendarDaysBetween(times[i - 1]!, times[i]!, clock.timeZone);
  }
  return total / (times.length - 1);
}

/** Completions within the last `days` calendar days including today. */
export function completionsInLastDays(
  events: readonly CompletionEvent[],
  days: number,
  clock: Clock,
): number {
  const from = addLocalDays(clock.now, -(days - 1), clock.timeZone);
  const fromDayDiff = (date: Date) => calendarDaysBetween(from, date, clock.timeZone);
  return events.filter((e) => e.kind === "DONE" && fromDayDiff(e.completedAt) >= 0 && e.completedAt <= clock.now)
    .length;
}
