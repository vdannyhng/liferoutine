import type { IconKey } from "@/domain/icons";
import type {
  IntervalUnit,
  Priority,
  ReminderOffset,
  RoutineType,
  Schedule,
  ScheduleInput,
} from "@/domain/routines/schedule";
import type { RoutineInput } from "@/lib/validation/routine";

/** Flat, string-based form state; converted to the validated input on submit. */
export interface RoutineFormValues {
  title: string;
  categoryId: string;
  icon: IconKey | "";
  description: string;
  type: RoutineType;
  intervalValue: string;
  intervalUnit: IntervalUnit;
  targetCount: string;
  weekdays: number[];
  time: string;
  everyNWeeks: string;
  startDate: string;
  dueDate: string;
  dueTime: string;
  priority: Priority;
  reminder: ReminderOffset;
  estimatedMinutes: string;
}

export function emptyFormValues(todayKey: string, type: RoutineType = "INTERVAL"): RoutineFormValues {
  return {
    title: "",
    categoryId: "",
    icon: "",
    description: "",
    type,
    intervalValue: "7",
    intervalUnit: "DAY",
    targetCount: "3",
    weekdays: [],
    time: "",
    everyNWeeks: "1",
    startDate: todayKey,
    dueDate: todayKey,
    dueTime: "",
    priority: "NORMAL",
    reminder: "NONE",
    estimatedMinutes: "",
  };
}

export function scheduleToFormValues(schedule: ScheduleInput | Schedule, base: RoutineFormValues): RoutineFormValues {
  switch (schedule.type) {
    case "INTERVAL":
      return { ...base, type: "INTERVAL", intervalValue: String(schedule.value), intervalUnit: schedule.unit };
    case "WEEKLY_GOAL":
      return { ...base, type: "WEEKLY_GOAL", targetCount: String(schedule.targetCount) };
    case "FIXED_SCHEDULE":
      return {
        ...base,
        type: "FIXED_SCHEDULE",
        weekdays: [...schedule.weekdays],
        time: schedule.time ?? "",
        everyNWeeks: String(schedule.everyNWeeks ?? 1),
        startDate: schedule.startDate ?? base.startDate,
      };
    case "ONE_OFF":
      return { ...base, type: "ONE_OFF", dueDate: schedule.dueDate, dueTime: schedule.dueTime ?? "" };
    case "MANUAL":
      return { ...base, type: "MANUAL" };
  }
}

const toInt = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));

export function formValuesToSchedule(values: RoutineFormValues): ScheduleInput {
  switch (values.type) {
    case "INTERVAL":
      return { type: "INTERVAL", value: toInt(values.intervalValue), unit: values.intervalUnit };
    case "WEEKLY_GOAL":
      return { type: "WEEKLY_GOAL", targetCount: toInt(values.targetCount), weekStartsOn: 1 };
    case "FIXED_SCHEDULE": {
      const everyNWeeks = toInt(values.everyNWeeks);
      return {
        type: "FIXED_SCHEDULE",
        weekdays: values.weekdays,
        time: values.time || undefined,
        everyNWeeks,
        startDate: everyNWeeks > 1 ? values.startDate : undefined,
      };
    }
    case "ONE_OFF":
      return { type: "ONE_OFF", dueDate: values.dueDate, dueTime: values.dueTime || undefined };
    case "MANUAL":
      return { type: "MANUAL" };
  }
}

/** Reminders only make sense for routines with a due date. */
export function supportsReminder(type: RoutineType): boolean {
  return type === "INTERVAL" || type === "FIXED_SCHEDULE" || type === "ONE_OFF";
}

export function formValuesToInput(values: RoutineFormValues): RoutineInput {
  const minutes = toInt(values.estimatedMinutes);
  return {
    title: values.title,
    description: values.description,
    categoryId: values.categoryId || null,
    icon: values.icon || null,
    priority: values.priority,
    schedule: formValuesToSchedule(values),
    reminder: { offset: supportsReminder(values.type) ? values.reminder : "NONE" },
    estimatedMinutes: Number.isNaN(minutes) ? null : minutes,
  };
}
