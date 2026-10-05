import { describe, expect, it } from "vitest";
import { clockAt, local } from "@/tests/time";
import { buildDashboard } from "./dashboard";
import { calculateDashboardPriority, DASHBOARD_RANK } from "./priority";
import { scheduleSchema, type ScheduleInput } from "./schedule";
import type { CompletionEvent, Priority, RoutineSnapshot, RoutineStatus } from "./types";

const dueAt = local(2026, 10, 5);

describe("calculateDashboardPriority", () => {
  const cases: [RoutineStatus, Priority, number | null][] = [
    [{ kind: "overdue", dueAt, daysOverdue: 1, hasTime: false }, "HIGH", DASHBOARD_RANK.OVERDUE_HIGH],
    [{ kind: "due", dueAt, dayOffset: 0, hasTime: false }, "HIGH", DASHBOARD_RANK.DUE_HIGH],
    [{ kind: "overdue", dueAt, daysOverdue: 1, hasTime: false }, "NORMAL", DASHBOARD_RANK.OVERDUE],
    [{ kind: "overdue", dueAt, daysOverdue: 1, hasTime: false }, "LOW", DASHBOARD_RANK.OVERDUE],
    [{ kind: "due", dueAt, dayOffset: 0, hasTime: false }, "NORMAL", DASHBOARD_RANK.DUE],
    [{ kind: "upcoming", dueAt, daysUntil: 3, hasTime: false }, "HIGH", DASHBOARD_RANK.UPCOMING],
    [{ kind: "upcoming", dueAt, daysUntil: 30, hasTime: false }, "HIGH", null],
    [{ kind: "manual", daysSince: 4 }, "NORMAL", null],
    [{ kind: "paused" }, "HIGH", null],
    [{ kind: "done", completedAt: dueAt }, "HIGH", null],
  ];

  it.each(cases)("ranks %o with priority %s as %s", (status, priority, rank) => {
    expect(calculateDashboardPriority(status, priority)?.rank ?? null).toBe(rank);
  });
});

function snapshot(id: string, title: string, schedule: ScheduleInput, priority: Priority = "NORMAL"): RoutineSnapshot {
  return {
    id,
    title,
    priority,
    schedule: scheduleSchema.parse(schedule),
    reminder: { offset: "NONE" },
    isPaused: false,
    rhythmAnchorAt: null,
    snoozedUntil: null,
    createdAt: local(2026, 9, 1),
  };
}

describe("buildDashboard", () => {
  const now = local(2026, 10, 11, 10); // Sunday
  const done = (d: Date): CompletionEvent => ({ completedAt: d, kind: "DONE" });

  const inputs = [
    { routine: snapshot("a", "Staubsaugen", { type: "INTERVAL", value: 7, unit: "DAY" }), events: [done(local(2026, 10, 2))] },
    { routine: snapshot("b", "Bad putzen", { type: "INTERVAL", value: 7, unit: "DAY" }, "HIGH"), events: [done(local(2026, 10, 3))] },
    { routine: snapshot("c", "Gym", { type: "WEEKLY_GOAL", targetCount: 3 }), events: [done(local(2026, 10, 6)), done(local(2026, 10, 8))] },
    { routine: snapshot("d", "Bettwäsche", { type: "INTERVAL", value: 14, unit: "DAY" }), events: [done(local(2026, 10, 1))] },
    { routine: snapshot("e", "Abwasch", { type: "INTERVAL", value: 1, unit: "DAY" }), events: [done(local(2026, 10, 10))] },
    { routine: snapshot("f", "Auto waschen", { type: "MANUAL" }), events: [] },
    { routine: snapshot("g", "Lesen", { type: "WEEKLY_GOAL", targetCount: 1 }), events: [done(local(2026, 10, 6))] },
  ].map((input) => ({ ...input, data: input.routine.id }));

  it("groups and sorts deterministically", () => {
    const dashboard = buildDashboard(inputs, clockAt(now));
    expect(dashboard.overdue.map((e) => e.id)).toEqual(["b", "a"]);
    expect(dashboard.today.map((e) => e.id)).toEqual(["e", "c"]);
    expect(dashboard.week.map((e) => e.id)).toEqual(["g"]);
    expect(dashboard.upcoming.map((e) => e.id)).toEqual(["d"]);
  });

  it("returns the same order regardless of input order", () => {
    const reversed = buildDashboard([...inputs].reverse(), clockAt(now));
    const normal = buildDashboard(inputs, clockAt(now));
    expect(reversed.overdue.map((e) => e.id)).toEqual(normal.overdue.map((e) => e.id));
    expect(reversed.today.map((e) => e.id)).toEqual(normal.today.map((e) => e.id));
  });

  it("removes a routine from today's priority once it is done", () => {
    const withDone = inputs.map((input) =>
      input.routine.id === "e" ? { ...input, events: [...input.events, done(now)] } : input,
    );
    const dashboard = buildDashboard(withDone, clockAt(now));
    expect(dashboard.today.map((e) => e.id)).not.toContain("e");
    expect(dashboard.upcoming.map((e) => e.id)).toContain("e");
  });
});
