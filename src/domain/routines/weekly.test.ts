import { describe, expect, it } from "vitest";
import { clockAt, local } from "@/tests/time";
import { weeklyGoalScheduleSchema } from "./schedule";
import { calculateWeeklyProgress } from "./status";
import type { CompletionEvent } from "./types";

const gym = weeklyGoalScheduleSchema.parse({ type: "WEEKLY_GOAL", targetCount: 3 });
const done = (completedAt: Date): CompletionEvent => ({ completedAt, kind: "DONE" });

describe("calculateWeeklyProgress", () => {
  it("counts completions of the current week (Mon–Sun)", () => {
    // 2026-10-05 is a Monday.
    const events = [done(local(2026, 10, 5, 7)), done(local(2026, 10, 7, 18)), done(local(2026, 10, 2, 18))];
    const progress = calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 8)));
    expect(progress).toMatchObject({ completed: 2, remaining: 1, achieved: false, daysLeft: 4 });
  });

  it("starts at zero with a new week while history is kept", () => {
    const events = [done(local(2026, 10, 5)), done(local(2026, 10, 6)), done(local(2026, 10, 11, 23, 30))];
    expect(calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 11, 23, 45)))).toMatchObject({
      completed: 3,
      achieved: true,
    });
    expect(calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 12, 0, 15)))).toMatchObject({
      completed: 0,
      remaining: 3,
      daysLeft: 7,
    });
  });

  it("becomes urgent on Sunday when one session is missing", () => {
    const events = [done(local(2026, 10, 5)), done(local(2026, 10, 8))];
    const progress = calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 11, 10)));
    expect(progress).toMatchObject({ completed: 2, remaining: 1, daysLeft: 1, urgent: true });
  });

  it("is relaxed early in the week", () => {
    const progress = calculateWeeklyProgress(gym, [], clockAt(local(2026, 10, 5, 8)));
    expect(progress).toMatchObject({ urgent: false, behind: false, daysLeft: 7 });
  });

  it("becomes urgent when every remaining day is needed", () => {
    const progress = calculateWeeklyProgress(gym, [], clockAt(local(2026, 10, 9, 8))); // Friday
    expect(progress).toMatchObject({ remaining: 3, daysLeft: 3, urgent: true, behind: true });
  });

  it("is not urgent today after skipping today", () => {
    const events: CompletionEvent[] = [{ completedAt: local(2026, 10, 11, 9), kind: "SKIPPED" }];
    const progress = calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 11, 10)));
    expect(progress.urgent).toBe(false);
  });

  it("supports weeks starting on Sunday", () => {
    const sundayWeek = weeklyGoalScheduleSchema.parse({ type: "WEEKLY_GOAL", targetCount: 2, weekStartsOn: 0 });
    const events = [done(local(2026, 10, 4, 10))]; // Sunday
    expect(calculateWeeklyProgress(sundayWeek, events, clockAt(local(2026, 10, 5))).completed).toBe(1);
  });

  it("handles a week spanning the year change", () => {
    const events = [done(local(2026, 12, 29)), done(local(2027, 1, 2))];
    expect(calculateWeeklyProgress(gym, events, clockAt(local(2027, 1, 3))).completed).toBe(2);
  });

  it("handles the week of the autumn DST change", () => {
    // The week of Oct 19–25, 2026 ends on the 25-hour day.
    const events = [done(local(2026, 10, 25, 23, 30))];
    expect(calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 25, 23, 50))).completed).toBe(1);
    expect(calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 26, 0, 10))).completed).toBe(0);
  });

  it("reports whether a session was done today", () => {
    const events = [done(local(2026, 10, 6, 7))];
    expect(calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 6, 20))).doneToday).toBe(true);
    expect(calculateWeeklyProgress(gym, events, clockAt(local(2026, 10, 7, 8))).doneToday).toBe(false);
  });
});
