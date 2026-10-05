import { TZDate } from "@date-fns/tz";
import type { Clock } from "@/domain/routines/types";

export const ZONE = "Europe/Berlin";

/** Instant for a local wall-clock time (month is 1-based). */
export function local(year: number, month: number, day: number, hour = 12, minute = 0, zone = ZONE): Date {
  return new Date(new TZDate(year, month - 1, day, hour, minute, zone).getTime());
}

export function clockAt(now: Date, timeZone = ZONE): Clock {
  return { now, timeZone };
}
