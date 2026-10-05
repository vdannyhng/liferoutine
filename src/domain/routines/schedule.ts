import { z } from "zod";
import { parseLocalDateParts, parseLocalTime } from "@/lib/dates/zoned";

export const ROUTINE_TYPES = ["INTERVAL", "WEEKLY_GOAL", "FIXED_SCHEDULE", "ONE_OFF", "MANUAL"] as const;
export type RoutineType = (typeof ROUTINE_TYPES)[number];

export const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const INTERVAL_UNITS = ["DAY", "WEEK", "MONTH"] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

export const MAX_INTERVAL_VALUE = 365;
export const MAX_WEEKLY_TARGET = 14;
export const MAX_WEEK_INTERVAL = 4;
export const DEFAULT_WEEK_STARTS_ON = 1;

export const localDateSchema = z
  .string()
  .refine((value) => parseLocalDateParts(value) !== null, { message: "Ungültiges Datum" });

export const localTimeSchema = z
  .string()
  .refine((value) => parseLocalTime(value) !== null, { message: "Ungültige Uhrzeit" });

export const intervalScheduleSchema = z.object({
  type: z.literal("INTERVAL"),
  value: z.number().int().min(1).max(MAX_INTERVAL_VALUE),
  unit: z.enum(INTERVAL_UNITS),
});

export const weeklyGoalScheduleSchema = z.object({
  type: z.literal("WEEKLY_GOAL"),
  targetCount: z.number().int().min(1).max(MAX_WEEKLY_TARGET),
  weekStartsOn: z.number().int().min(0).max(6).default(DEFAULT_WEEK_STARTS_ON),
});

/** Weekdays use ISO numbering: 1 = Monday … 7 = Sunday. */
export const fixedScheduleSchema = z.object({
  type: z.literal("FIXED_SCHEDULE"),
  weekdays: z
    .array(z.number().int().min(1).max(7))
    .min(1, "Mindestens einen Wochentag wählen")
    .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  time: localTimeSchema.optional(),
  /** 1 = every week, 2 = every second week, … */
  everyNWeeks: z.number().int().min(1).max(MAX_WEEK_INTERVAL).default(1),
  /** Local date of a week that has an occurrence (anchor for everyNWeeks > 1). */
  startDate: localDateSchema.optional(),
});

export const oneOffScheduleSchema = z.object({
  type: z.literal("ONE_OFF"),
  dueDate: localDateSchema,
  dueTime: localTimeSchema.optional(),
});

export const manualScheduleSchema = z.object({
  type: z.literal("MANUAL"),
});

export const scheduleSchema = z.discriminatedUnion("type", [
  intervalScheduleSchema,
  weeklyGoalScheduleSchema,
  fixedScheduleSchema,
  oneOffScheduleSchema,
  manualScheduleSchema,
]);

export type IntervalSchedule = z.infer<typeof intervalScheduleSchema>;
export type WeeklyGoalSchedule = z.infer<typeof weeklyGoalScheduleSchema>;
export type FixedSchedule = z.infer<typeof fixedScheduleSchema>;
export type OneOffSchedule = z.infer<typeof oneOffScheduleSchema>;
export type ManualSchedule = z.infer<typeof manualScheduleSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type ScheduleInput = z.input<typeof scheduleSchema>;

export const REMINDER_OFFSETS = ["NONE", "AT_DUE", "HOUR_BEFORE", "EVENING_BEFORE", "DAY_BEFORE"] as const;
export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

export const reminderConfigSchema = z.object({
  offset: z.enum(REMINDER_OFFSETS).default("NONE"),
});
export type ReminderConfig = z.infer<typeof reminderConfigSchema>;

export const DEFAULT_REMINDER: ReminderConfig = { offset: "NONE" };

/** Parses stored JSON; returns null instead of throwing for corrupt rows. */
export function parseSchedule(value: unknown): Schedule | null {
  const result = scheduleSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseReminder(value: unknown): ReminderConfig {
  const result = reminderConfigSchema.safeParse(value ?? DEFAULT_REMINDER);
  return result.success ? result.data : DEFAULT_REMINDER;
}
