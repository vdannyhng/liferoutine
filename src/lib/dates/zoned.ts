import { TZDate, tz } from "@date-fns/tz";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  getISODay,
  startOfDay,
  startOfWeek,
} from "date-fns";

/**
 * Calendar logic always runs in an explicit IANA time zone. Instants are plain
 * `Date`s (UTC internally); "days" are evaluated in the user's local zone.
 */
export type TimeZone = string;

export const FALLBACK_TIME_ZONE: TimeZone = "Europe/Berlin";

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Helpers return plain Dates so zone-bound objects never leak out of this module. */
function plain(date: Date): Date {
  return new Date(date.getTime());
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function inZone(date: Date, zone: TimeZone): TZDate {
  return new TZDate(date.getTime(), zone);
}

export function startOfLocalDay(date: Date, zone: TimeZone): Date {
  return plain(startOfDay(date, { in: tz(zone) }));
}

export function addLocalDays(date: Date, amount: number, zone: TimeZone): Date {
  return plain(addDays(date, amount, { in: tz(zone) }));
}

export function addLocalWeeks(date: Date, amount: number, zone: TimeZone): Date {
  return plain(addWeeks(date, amount, { in: tz(zone) }));
}

export function addLocalMonths(date: Date, amount: number, zone: TimeZone): Date {
  return plain(addMonths(date, amount, { in: tz(zone) }));
}

/** Number of calendar days from `from` to `to` in the given zone (DST-safe). */
export function calendarDaysBetween(from: Date, to: Date, zone: TimeZone): number {
  return differenceInCalendarDays(to, from, { in: tz(zone) });
}

export function startOfLocalWeek(date: Date, weekStartsOn: WeekStartsOn, zone: TimeZone): Date {
  return plain(startOfWeek(date, { weekStartsOn, in: tz(zone) }));
}

export function localIsoWeekday(date: Date, zone: TimeZone): IsoWeekday {
  return getISODay(date, { in: tz(zone) }) as IsoWeekday;
}

export function isSameLocalDay(a: Date, b: Date, zone: TimeZone): boolean {
  return calendarDaysBetween(a, b, zone) === 0;
}

export interface LocalDateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseLocalDateParts(value: string): LocalDateParts | null {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const parts = { year: Number(y), month: Number(m), day: Number(d) };
  // Reject impossible dates such as 2026-02-30.
  const probe = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    probe.getUTCFullYear() !== parts.year ||
    probe.getUTCMonth() !== parts.month - 1 ||
    probe.getUTCDate() !== parts.day
  ) {
    return null;
  }
  return parts;
}

export function parseLocalTime(value: string): { hours: number; minutes: number } | null {
  const match = LOCAL_TIME_PATTERN.exec(value);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/** Start of the given local calendar date ("YYYY-MM-DD") in the zone. */
export function localDateToInstant(value: string, zone: TimeZone): Date {
  const parts = parseLocalDateParts(value);
  if (!parts) throw new RangeError(`Invalid local date: ${value}`);
  return plain(new TZDate(parts.year, parts.month - 1, parts.day, zone));
}

/** The instant at `time` ("HH:mm") on the local day containing `day`. */
export function atLocalTime(day: Date, time: string, zone: TimeZone): Date {
  const parsed = parseLocalTime(time);
  if (!parsed) throw new RangeError(`Invalid local time: ${time}`);
  const local = inZone(day, zone);
  return plain(
    new TZDate(
      local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    parsed.hours,
      parsed.minutes,
      zone,
    ),
  );
}

/** "YYYY-MM-DD" for the local day containing the instant. */
export function toLocalDateKey(date: Date, zone: TimeZone): string {
  return format(inZone(date, zone), "yyyy-MM-dd");
}

/** "HH:mm" for the instant in the zone. */
export function toLocalTimeKey(date: Date, zone: TimeZone): string {
  return format(inZone(date, zone), "HH:mm");
}
