import type { Schedule } from "@/domain/routines/schedule";
import type { Clock, RoutineState, RoutineStatus } from "@/domain/routines/types";
import { calendarDaysBetween, inZone, localDateToInstant, toLocalTimeKey, type TimeZone } from "@/lib/dates/zoned";
import { de } from "./de";

const m = de;

export type StatusTone = "overdue" | "today" | "done" | "neutral";

export interface StatusText {
  label: string;
  tone: StatusTone;
}

const MORNING_END_HOUR = 11;
const DAY_END_HOUR = 18;

export function formatDate(date: Date, zone: TimeZone, style: "short" | "long" | "weekday" = "short"): string {
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : style === "long"
        ? { day: "numeric", month: "long" }
        : { weekday: "long", day: "numeric", month: "long" };
  return new Intl.DateTimeFormat(m.locale, { ...options, timeZone: zone }).format(date);
}

export function formatTime(date: Date, zone: TimeZone): string {
  return toLocalTimeKey(date, zone);
}

export function greeting(now: Date, zone: TimeZone): string {
  const hour = inZone(now, zone).getHours();
  if (hour < MORNING_END_HOUR) return m.greeting.morning;
  if (hour < DAY_END_HOUR) return m.greeting.day;
  return m.greeting.evening;
}

export function formatStatus(status: RoutineStatus, clock: Clock): StatusText {
  const zone = clock.timeZone;
  switch (status.kind) {
    case "overdue":
      return {
        label: status.daysOverdue === 1 ? m.status.overdueYesterday : m.status.overdueDays(status.daysOverdue),
        tone: "overdue",
      };
    case "due": {
      const time = status.hasTime ? formatTime(status.dueAt, zone) : null;
      if (status.dayOffset === 0) {
        return { label: time ? m.status.dueTodayAt(time) : m.status.dueToday, tone: "today" };
      }
      if (status.dayOffset === 1) {
        return { label: time ? m.status.dueTomorrowAt(time) : m.status.dueTomorrow, tone: "today" };
      }
      return { label: m.status.dueInDays(status.dayOffset), tone: "today" };
    }
    case "upcoming":
      return {
        label: status.daysUntil === 1 ? m.status.upcomingTomorrow : m.status.upcomingDays(status.daysUntil),
        tone: "neutral",
      };
    case "weekly": {
      const { progress } = status;
      if (progress.achieved) return { label: m.status.weeklyAchieved, tone: "done" };
      if (progress.urgent) return { label: m.status.weeklyUrgent(progress.remaining), tone: "today" };
      return { label: m.status.weeklyRemaining(progress.remaining), tone: "neutral" };
    }
    case "manual":
      return {
        label: status.daysSince === null ? m.status.canBeDone : formatDaysSince(status.daysSince, true),
        tone: "neutral",
      };
    case "paused":
      return { label: m.status.paused, tone: "neutral" };
    case "done":
      return { label: m.status.finished(formatDate(status.completedAt, zone)), tone: "done" };
  }
}

function formatDaysSince(days: number, manual = false): string {
  if (days <= 0) return m.status.lastToday;
  if (days === 1) return m.status.lastYesterday;
  return manual ? m.status.manualDays(days) : m.status.lastDays(days);
}

export function formatLastDone(state: Pick<RoutineState, "lastDoneAt">, clock: Clock): string {
  if (!state.lastDoneAt) return m.status.neverDone;
  return formatDaysSince(calendarDaysBetween(state.lastDoneAt, clock.now, clock.timeZone));
}

/** Short relative label used in compact lists ("in 2 Tagen"). */
export function formatRelativeDue(status: RoutineStatus, clock: Clock): string {
  if (status.kind === "upcoming") return m.status.inDays(status.daysUntil);
  return formatStatus(status, clock).label;
}

function formatWeekdays(weekdays: readonly number[]): string {
  if (weekdays.length === 1) return m.weekdaysLong[weekdays[0]! - 1]!;
  return weekdays.map((d) => m.weekdaysShort[d - 1]).join(", ");
}

export function formatSchedule(schedule: Schedule, zone: TimeZone): string {
  switch (schedule.type) {
    case "INTERVAL": {
      const n = schedule.value;
      if (schedule.unit === "DAY") return n === 1 ? m.schedule.everyDay : m.schedule.everyNDays(n);
      if (schedule.unit === "WEEK") return n === 1 ? m.schedule.everyWeek : m.schedule.everyNWeeks(n);
      return n === 1 ? m.schedule.everyMonth : m.schedule.everyNMonths(n);
    }
    case "WEEKLY_GOAL":
      return m.schedule.perWeek(schedule.targetCount);
    case "FIXED_SCHEDULE": {
      const days = formatWeekdays(schedule.weekdays);
      return schedule.everyNWeeks > 1
        ? m.schedule.fixedEveryNWeeks(schedule.everyNWeeks, days, schedule.time)
        : m.schedule.fixed(days, schedule.time);
    }
    case "ONE_OFF":
      return m.schedule.oneOff(formatDate(localDateToInstant(schedule.dueDate, zone), zone), schedule.dueTime);
    case "MANUAL":
      return m.schedule.manual;
  }
}
