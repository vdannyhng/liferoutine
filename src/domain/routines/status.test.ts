import { describe, expect, it } from "vitest";
import { clockAt, local, ZONE } from "@/tests/time";
import { toLocalDateKey } from "@/lib/dates/zoned";
import { scheduleSchema, type ScheduleInput } from "./schedule";
import { calculateNextDueDate, calculateRoutineStatus } from "./status";
import type { CompletionEvent, RoutineSnapshot } from "./types";

function routine(schedule: ScheduleInput, overrides: Partial<RoutineSnapshot> = {}): RoutineSnapshot {
  return {
    id: "r1",
    title: "Test",
    priority: "NORMAL",
    schedule: scheduleSchema.parse(schedule),
    reminder: { offset: "NONE" },
    isPaused: false,
    rhythmAnchorAt: null,
    snoozedUntil: null,
    createdAt: local(2026, 1, 1),
    ...overrides,
  };
}

const done = (completedAt: Date): CompletionEvent => ({ completedAt, kind: "DONE" });
const skipped = (completedAt: Date): CompletionEvent => ({ completedAt, kind: "SKIPPED" });

const status = (r: RoutineSnapshot, events: CompletionEvent[], now: Date) =>
  calculateRoutineStatus(r, events, clockAt(now)).status;

describe("INTERVAL", () => {
  const vacuum = routine({ type: "INTERVAL", value: 7, unit: "DAY" });
  const events = [done(local(2026, 10, 1, 10))];

  it("follows the spec example (every 7 days, last done Oct 1)", () => {
    expect(status(vacuum, events, local(2026, 10, 5))).toMatchObject({ kind: "upcoming", daysUntil: 3 });
    expect(status(vacuum, events, local(2026, 10, 8))).toMatchObject({ kind: "due", dayOffset: 0 });
    expect(status(vacuum, events, local(2026, 10, 9))).toMatchObject({ kind: "overdue", daysOverdue: 1 });
    expect(status(vacuum, events, local(2026, 10, 10))).toMatchObject({ kind: "overdue", daysOverdue: 2 });
  });

  it("is due right away when it was never done", () => {
    const fresh = routine({ type: "INTERVAL", value: 7, unit: "DAY" }, { createdAt: local(2026, 10, 5, 9) });
    expect(status(fresh, [], local(2026, 10, 5, 18))).toMatchObject({ kind: "due", dayOffset: 0 });
  });

  it("handles month changes", () => {
    const next = calculateNextDueDate(vacuum, [done(local(2026, 9, 28, 20))], clockAt(local(2026, 9, 29)));
    expect(toLocalDateKey(next!, ZONE)).toBe("2026-10-05");
  });

  it("handles year changes", () => {
    const yearEnd = [done(local(2026, 12, 28, 9))];
    const next = calculateNextDueDate(vacuum, yearEnd, clockAt(local(2026, 12, 30)));
    expect(toLocalDateKey(next!, ZONE)).toBe("2027-01-04");
    expect(status(vacuum, yearEnd, local(2027, 1, 6))).toMatchObject({ kind: "overdue", daysOverdue: 2 });
  });

  it("adds months and clamps to month end, also in leap years", () => {
    const monthly = routine({ type: "INTERVAL", value: 1, unit: "MONTH" });
    const next = calculateNextDueDate(monthly, [done(local(2026, 1, 31))], clockAt(local(2026, 2, 1)));
    expect(toLocalDateKey(next!, ZONE)).toBe("2026-02-28");
    const leap = calculateNextDueDate(monthly, [done(local(2028, 1, 31))], clockAt(local(2028, 2, 1)));
    expect(toLocalDateKey(leap!, ZONE)).toBe("2028-02-29");
  });

  it("supports week intervals and 90-day intervals across a leap day", () => {
    const sheets = routine({ type: "INTERVAL", value: 2, unit: "WEEK" });
    const next = calculateNextDueDate(sheets, [done(local(2028, 2, 20))], clockAt(local(2028, 2, 21)));
    expect(toLocalDateKey(next!, ZONE)).toBe("2028-03-05");
    const descale = routine({ type: "INTERVAL", value: 90, unit: "DAY" });
    const next90 = calculateNextDueDate(descale, [done(local(2028, 1, 1))], clockAt(local(2028, 1, 2)));
    expect(toLocalDateKey(next90!, ZONE)).toBe("2028-03-31");
  });

  it("is not shifted by daylight saving time", () => {
    const daily = routine({ type: "INTERVAL", value: 1, unit: "DAY" });
    // Done late on the day before the spring change.
    const spring = [done(local(2026, 3, 28, 23, 30))];
    expect(status(daily, spring, local(2026, 3, 29, 0, 30))).toMatchObject({ kind: "due" });
    expect(status(daily, spring, local(2026, 3, 30, 0, 30))).toMatchObject({ kind: "overdue", daysOverdue: 1 });
    // Done late on the day before the autumn change.
    const autumn = [done(local(2026, 10, 24, 23, 30))];
    const next = calculateNextDueDate(vacuum, autumn, clockAt(local(2026, 10, 25)));
    expect(toLocalDateKey(next!, ZONE)).toBe("2026-10-31");
  });

  it("counts a completion after local midnight for the new local day", () => {
    const daily = routine({ type: "INTERVAL", value: 1, unit: "DAY" });
    const lateNight = [done(new Date("2026-10-04T22:30:00Z"))]; // Oct 5, 00:30 in Berlin
    expect(status(daily, lateNight, local(2026, 10, 5, 20))).toMatchObject({ kind: "upcoming", daysUntil: 1 });
  });

  it("uses the latest completion even when an older one is entered afterwards", () => {
    const backdated = [done(local(2026, 10, 4, 9)), done(local(2026, 9, 20, 9))];
    expect(status(vacuum, backdated, local(2026, 10, 5))).toMatchObject({ kind: "upcoming", daysUntil: 6 });
  });

  it("recalculates when a missed completion is entered for an earlier date", () => {
    const before = status(vacuum, [done(local(2026, 9, 20))], local(2026, 10, 5));
    expect(before).toMatchObject({ kind: "overdue", daysOverdue: 8 });
    const after = status(vacuum, [done(local(2026, 9, 20)), done(local(2026, 10, 3))], local(2026, 10, 5));
    expect(after).toMatchObject({ kind: "upcoming", daysUntil: 5 });
  });

  it("treats skipping like handling the current cycle", () => {
    expect(status(vacuum, [skipped(local(2026, 10, 9))], local(2026, 10, 10))).toMatchObject({
      kind: "upcoming",
      daysUntil: 6,
    });
  });

  it("ignores history before a restart anchor", () => {
    const restarted = routine(
      { type: "INTERVAL", value: 7, unit: "DAY" },
      { rhythmAnchorAt: local(2026, 10, 5, 8) },
    );
    expect(status(restarted, [done(local(2026, 9, 1))], local(2026, 10, 5, 9))).toMatchObject({
      kind: "upcoming",
      daysUntil: 7,
    });
  });

  it("shows tomorrow's due date already in the evening with an evening reminder", () => {
    const withReminder = { ...vacuum, reminder: { offset: "EVENING_BEFORE" as const } };
    expect(status(withReminder, events, local(2026, 10, 7, 17))).toMatchObject({ kind: "upcoming" });
    expect(status(withReminder, events, local(2026, 10, 7, 19))).toMatchObject({ kind: "due", dayOffset: 1 });
  });
});

describe("snooze and pause", () => {
  const vacuum = routine({ type: "INTERVAL", value: 7, unit: "DAY" });
  const events = [done(local(2026, 9, 20))];

  it("moves an overdue routine to the snooze day", () => {
    const snoozed = { ...vacuum, snoozedUntil: local(2026, 10, 7, 0) };
    expect(status(snoozed, events, local(2026, 10, 5))).toMatchObject({ kind: "upcoming", daysUntil: 2 });
    expect(status(snoozed, events, local(2026, 10, 7))).toMatchObject({ kind: "due", dayOffset: 0 });
    expect(status(snoozed, events, local(2026, 10, 8))).toMatchObject({ kind: "overdue", daysOverdue: 1 });
  });

  it("returns paused for paused routines", () => {
    expect(status({ ...vacuum, isPaused: true }, events, local(2026, 10, 5))).toEqual({ kind: "paused" });
  });
});

describe("FIXED_SCHEDULE", () => {
  // Pick-up Tuesday 07:00, shown from the evening before.
  const trash = routine(
    { type: "FIXED_SCHEDULE", weekdays: [2], time: "07:00" },
    { reminder: { offset: "EVENING_BEFORE" }, createdAt: local(2026, 9, 1) },
  );

  it("appears the evening before the pick-up", () => {
    const lastWeek = [done(local(2026, 9, 28, 20))];
    expect(status(trash, lastWeek, local(2026, 10, 5, 17))).toMatchObject({ kind: "upcoming", daysUntil: 1 });
    const evening = status(trash, lastWeek, local(2026, 10, 5, 19));
    expect(evening).toMatchObject({ kind: "due", dayOffset: 1, hasTime: true });
  });

  it("is handled by a completion in the lead window and moves to next week", () => {
    const events = [done(local(2026, 10, 5, 19, 15))];
    expect(status(trash, events, local(2026, 10, 6, 8))).toMatchObject({ kind: "upcoming", daysUntil: 7 });
  });

  it("is overdue after a missed occurrence until the next one is active", () => {
    const events = [done(local(2026, 9, 28, 20))];
    expect(status(trash, events, local(2026, 10, 7, 10))).toMatchObject({ kind: "overdue", daysOverdue: 1 });
    expect(status(trash, events, local(2026, 10, 12, 19))).toMatchObject({ kind: "due", dayOffset: 1 });
  });

  it("is not overdue for occurrences before it was created", () => {
    const created = { ...trash, createdAt: local(2026, 10, 7, 9) };
    expect(status(created, [], local(2026, 10, 7, 10))).toMatchObject({ kind: "upcoming", daysUntil: 6 });
  });

  it("supports multiple weekdays", () => {
    const plants = routine({ type: "FIXED_SCHEDULE", weekdays: [3, 7] }, { createdAt: local(2026, 10, 1) });
    // Sunday Oct 4 was missed.
    expect(status(plants, [], local(2026, 10, 5))).toMatchObject({ kind: "overdue", daysOverdue: 1 });
    expect(status(plants, [done(local(2026, 10, 4))], local(2026, 10, 5))).toMatchObject({
      kind: "upcoming",
      daysUntil: 2,
    });
  });

  it("supports every second week anchored on a start date", () => {
    const carton = routine(
      { type: "FIXED_SCHEDULE", weekdays: [4], everyNWeeks: 2, startDate: "2026-10-08" },
      { createdAt: local(2026, 10, 1) },
    );
    const next = calculateNextDueDate(carton, [done(local(2026, 10, 8))], clockAt(local(2026, 10, 9)));
    expect(toLocalDateKey(next!, ZONE)).toBe("2026-10-22");
  });

  it("crosses the year boundary", () => {
    const weekly = routine({ type: "FIXED_SCHEDULE", weekdays: [5] }, { createdAt: local(2026, 12, 1) });
    const next = calculateNextDueDate(weekly, [done(local(2026, 12, 25))], clockAt(local(2026, 12, 27)));
    expect(toLocalDateKey(next!, ZONE)).toBe("2027-01-01");
  });
});

describe("ONE_OFF", () => {
  const parcel = routine({ type: "ONE_OFF", dueDate: "2026-10-07" });

  it("is upcoming, due and overdue relative to the due date", () => {
    expect(status(parcel, [], local(2026, 10, 5))).toMatchObject({ kind: "upcoming", daysUntil: 2 });
    expect(status(parcel, [], local(2026, 10, 7, 23, 59))).toMatchObject({ kind: "due" });
    expect(status(parcel, [], local(2026, 10, 9))).toMatchObject({ kind: "overdue", daysOverdue: 2 });
  });

  it("is finished after completion and never comes back", () => {
    const completed = local(2026, 10, 6);
    expect(status(parcel, [done(completed)], local(2027, 1, 1))).toEqual({ kind: "done", completedAt: completed });
  });

  it("keeps the due time", () => {
    const timed = routine({ type: "ONE_OFF", dueDate: "2026-10-05", dueTime: "18:30" });
    const next = calculateNextDueDate(timed, [], clockAt(local(2026, 10, 5, 9)));
    expect(next!.toISOString()).toBe("2026-10-05T16:30:00.000Z");
  });
});

describe("MANUAL", () => {
  it("reports days since the last completion", () => {
    const wash = routine({ type: "MANUAL" });
    expect(status(wash, [done(local(2026, 8, 24, 18))], local(2026, 10, 5, 9))).toEqual({
      kind: "manual",
      daysSince: 42,
    });
    expect(status(wash, [], local(2026, 10, 5))).toEqual({ kind: "manual", daysSince: null });
  });
});
