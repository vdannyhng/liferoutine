import { describe, expect, it } from "vitest";
import type { ScheduleInput } from "@/domain/routines/schedule";
import { routineInputSchema } from "@/lib/validation/routine";
import { emptyFormValues, formValuesToInput, scheduleToFormValues } from "./form-values";

const today = "2026-10-05";

describe("routine form values", () => {
  it("builds a valid interval routine from the defaults", () => {
    const input = formValuesToInput({ ...emptyFormValues(today), title: "Staubsaugen" });
    expect(routineInputSchema.parse(input).schedule).toEqual({ type: "INTERVAL", value: 7, unit: "DAY" });
  });

  it("round-trips every schedule type", () => {
    const schedules: ScheduleInput[] = [
      { type: "INTERVAL", value: 3, unit: "MONTH" },
      { type: "WEEKLY_GOAL", targetCount: 3, weekStartsOn: 1 },
      { type: "FIXED_SCHEDULE", weekdays: [2, 4], time: "07:00", everyNWeeks: 2, startDate: "2026-10-08" },
      { type: "ONE_OFF", dueDate: "2026-10-09", dueTime: "18:30" },
      { type: "MANUAL" },
    ];
    for (const schedule of schedules) {
      const values = scheduleToFormValues(schedule, { ...emptyFormValues(today), title: "X" });
      expect(routineInputSchema.parse(formValuesToInput(values)).schedule).toEqual(schedule);
    }
  });

  it("drops reminders for routines without a due date", () => {
    const values = { ...emptyFormValues(today, "WEEKLY_GOAL"), title: "Gym", reminder: "DAY_BEFORE" as const };
    expect(formValuesToInput(values).reminder).toEqual({ offset: "NONE" });
  });

  it("reports German validation messages", () => {
    const values = { ...emptyFormValues(today), title: "", intervalValue: "" };
    const result = routineInputSchema.safeParse(formValuesToInput(values));
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(result.error!.issues.map((i) => [i.path.join("."), i.message]));
    expect(messages.title).toBe("Bitte gib einen Titel ein");
    expect(messages["schedule.value"]).toBe("Bitte gib eine Zahl ein");
  });
});
