import { describe, expect, it } from "vitest";
import { local } from "@/tests/time";
import {
  addLocalDays,
  addLocalMonths,
  atLocalTime,
  calendarDaysBetween,
  localDateToInstant,
  localIsoWeekday,
  parseLocalDateParts,
  startOfLocalDay,
  startOfLocalWeek,
  toLocalDateKey,
  toLocalTimeKey,
} from "./zoned";

const BERLIN = "Europe/Berlin";

describe("zoned date helpers", () => {
  it("evaluates calendar days in the user's zone, not UTC", () => {
    const justAfterMidnight = new Date("2026-10-04T22:30:00Z"); // 00:30 on Oct 5 in Berlin
    expect(toLocalDateKey(justAfterMidnight, BERLIN)).toBe("2026-10-05");
    expect(toLocalDateKey(justAfterMidnight, "UTC")).toBe("2026-10-04");
    expect(toLocalDateKey(justAfterMidnight, "America/New_York")).toBe("2026-10-04");
  });

  it("counts calendar days across the autumn DST change", () => {
    // 2026-10-25: clocks go back in Berlin, that day has 25 hours.
    expect(calendarDaysBetween(local(2026, 10, 24, 12), local(2026, 10, 26, 12), BERLIN)).toBe(2);
    expect(calendarDaysBetween(local(2026, 10, 25, 0, 30), local(2026, 10, 25, 23, 30), BERLIN)).toBe(0);
  });

  it("counts calendar days across the spring DST change", () => {
    // 2026-03-29: clocks go forward in Berlin, that day has 23 hours.
    expect(calendarDaysBetween(local(2026, 3, 28, 23, 30), local(2026, 3, 29, 23, 30), BERLIN)).toBe(1);
    const nextDay = addLocalDays(local(2026, 3, 28, 0, 0), 1, BERLIN);
    expect(toLocalTimeKey(nextDay, BERLIN)).toBe("00:00");
    expect(toLocalDateKey(nextDay, BERLIN)).toBe("2026-03-29");
  });

  it("keeps local midnight when adding days over DST", () => {
    const start = startOfLocalDay(local(2026, 10, 20, 15), BERLIN);
    const later = addLocalDays(start, 7, BERLIN);
    expect(toLocalDateKey(later, BERLIN)).toBe("2026-10-27");
    expect(toLocalTimeKey(later, BERLIN)).toBe("00:00");
  });

  it("clamps month arithmetic to the end of shorter months", () => {
    const jan31 = localDateToInstant("2026-01-31", BERLIN);
    expect(toLocalDateKey(addLocalMonths(jan31, 1, BERLIN), BERLIN)).toBe("2026-02-28");
    const leapJan31 = localDateToInstant("2028-01-31", BERLIN);
    expect(toLocalDateKey(addLocalMonths(leapJan31, 1, BERLIN), BERLIN)).toBe("2028-02-29");
  });

  it("validates local dates including leap years", () => {
    expect(parseLocalDateParts("2026-02-29")).toBeNull();
    expect(parseLocalDateParts("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseLocalDateParts("2026-13-01")).toBeNull();
    expect(parseLocalDateParts("05.10.2026")).toBeNull();
  });

  it("builds instants for local wall-clock times", () => {
    const day = localDateToInstant("2026-10-06", BERLIN);
    const at = atLocalTime(day, "07:00", BERLIN);
    expect(at.toISOString()).toBe("2026-10-06T05:00:00.000Z");
    const winter = atLocalTime(localDateToInstant("2026-12-01", BERLIN), "07:00", BERLIN);
    expect(winter.toISOString()).toBe("2026-12-01T06:00:00.000Z");
  });

  it("finds week starts and ISO weekdays across a year change", () => {
    const thursday = local(2026, 12, 31, 9);
    expect(localIsoWeekday(thursday, BERLIN)).toBe(4);
    expect(toLocalDateKey(startOfLocalWeek(thursday, 1, BERLIN), BERLIN)).toBe("2026-12-28");
    expect(toLocalDateKey(startOfLocalWeek(thursday, 0, BERLIN), BERLIN)).toBe("2026-12-27");
  });
});
