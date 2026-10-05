import { describe, expect, it } from "vitest";
import { clockAt, local } from "@/tests/time";
import { weeklyGoalScheduleSchema } from "./schedule";
import { averageGapDays, completionsInLastDays, weeklyHistory } from "./stats";
import type { CompletionEvent } from "./types";

const done = (completedAt: Date): CompletionEvent => ({ completedAt, kind: "DONE" });

describe("stats", () => {
  it("lists weekly results newest first", () => {
    const gym = weeklyGoalScheduleSchema.parse({ type: "WEEKLY_GOAL", targetCount: 3 });
    const events = [
      done(local(2026, 10, 5)),
      done(local(2026, 9, 29)),
      done(local(2026, 9, 30)),
      done(local(2026, 9, 22)),
    ];
    const weeks = weeklyHistory(gym, events, clockAt(local(2026, 10, 6)), 3);
    expect(weeks.map((w) => w.completed)).toEqual([1, 2, 1]);
    expect(weeks.every((w) => w.target === 3)).toBe(true);
  });

  it("computes the average gap between completions", () => {
    const events = [done(local(2026, 9, 20)), done(local(2026, 9, 28)), done(local(2026, 10, 5))];
    expect(averageGapDays(events, clockAt(local(2026, 10, 5)))).toBe(7.5);
    expect(averageGapDays(events.slice(0, 1), clockAt(local(2026, 10, 5)))).toBeNull();
  });

  it("counts completions in the last 30 days", () => {
    const events = [
      done(local(2026, 9, 5)),
      done(local(2026, 9, 6)),
      done(local(2026, 10, 1)),
      done(local(2026, 10, 5, 8)),
    ];
    expect(completionsInLastDays(events, 30, clockAt(local(2026, 10, 5, 12)))).toBe(3);
  });
});
