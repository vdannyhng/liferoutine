import type { IconKey } from "@/domain/icons";
import type { ScheduleInput } from "./schedule";

export interface RoutineTemplate {
  key: string;
  title: string;
  categoryName: string;
  icon: IconKey;
  schedule: ScheduleInput;
  /** Pre-selected in onboarding. */
  suggested: boolean;
}

const interval = (value: number, unit: "DAY" | "WEEK" | "MONTH" = "DAY"): ScheduleInput => ({
  type: "INTERVAL",
  value,
  unit,
});
const perWeek = (targetCount: number): ScheduleInput => ({ type: "WEEKLY_GOAL", targetCount, weekStartsOn: 1 });

export const ROUTINE_TEMPLATES: readonly RoutineTemplate[] = [
  { key: "vacuum", title: "Staubsaugen", categoryName: "Haushalt", icon: "sparkles", schedule: interval(7), suggested: true },
  { key: "bathroom", title: "Bad putzen", categoryName: "Haushalt", icon: "bath", schedule: interval(7), suggested: true },
  { key: "kitchen", title: "Küche gründlich reinigen", categoryName: "Haushalt", icon: "cooking-pot", schedule: interval(14), suggested: false },
  { key: "bedding", title: "Bettwäsche wechseln", categoryName: "Haushalt", icon: "bed", schedule: interval(14), suggested: true },
  { key: "towels", title: "Handtücher wechseln", categoryName: "Haushalt", icon: "shirt", schedule: interval(7), suggested: false },
  { key: "fridge", title: "Kühlschrank reinigen", categoryName: "Haushalt", icon: "refrigerator", schedule: interval(30), suggested: false },
  { key: "oven", title: "Backofen reinigen", categoryName: "Haushalt", icon: "spray-can", schedule: interval(3, "MONTH"), suggested: false },

  { key: "descale", title: "Kaffeemaschine entkalken", categoryName: "Wartung", icon: "coffee", schedule: interval(90), suggested: true },
  { key: "washer", title: "Waschmaschine reinigen", categoryName: "Wartung", icon: "washing-machine", schedule: interval(2, "MONTH"), suggested: false },
  { key: "dishwasher", title: "Geschirrspüler reinigen", categoryName: "Wartung", icon: "droplets", schedule: interval(2, "MONTH"), suggested: false },
  { key: "waterfilter", title: "Wasserfilter wechseln", categoryName: "Wartung", icon: "droplets", schedule: interval(1, "MONTH"), suggested: false },

  { key: "gym", title: "Training", categoryName: "Sport", icon: "dumbbell", schedule: perWeek(3), suggested: true },
  { key: "jogging", title: "Joggen", categoryName: "Sport", icon: "footprints", schedule: perWeek(2), suggested: false },
  { key: "mobility", title: "Mobility", categoryName: "Sport", icon: "activity", schedule: perWeek(4), suggested: false },
  { key: "cycling", title: "Fahrrad", categoryName: "Sport", icon: "bike", schedule: perWeek(2), suggested: false },
  { key: "walk", title: "Spaziergang", categoryName: "Sport", icon: "footprints", schedule: perWeek(5), suggested: false },

  { key: "water-plants", title: "Pflanzen gießen", categoryName: "Pflanzen", icon: "sprout", schedule: { type: "FIXED_SCHEDULE", weekdays: [7] }, suggested: true },
  { key: "fertilize", title: "Pflanzen düngen", categoryName: "Pflanzen", icon: "flower", schedule: interval(1, "MONTH"), suggested: false },

  { key: "tire-pressure", title: "Reifendruck kontrollieren", categoryName: "Auto", icon: "gauge", schedule: interval(1, "MONTH"), suggested: true },
  { key: "car-wash", title: "Auto waschen", categoryName: "Auto", icon: "car", schedule: { type: "MANUAL" }, suggested: false },
  { key: "oil", title: "Öl kontrollieren", categoryName: "Auto", icon: "fuel", schedule: interval(3, "MONTH"), suggested: false },

  { key: "dentist", title: "Zahnarzt-Kontrolle", categoryName: "Gesundheit", icon: "stethoscope", schedule: interval(6, "MONTH"), suggested: false },
];

/** Areas offered in onboarding (category names). */
export const ONBOARDING_AREAS = [
  { categoryName: "Haushalt", defaultSelected: true },
  { categoryName: "Sport", defaultSelected: true },
  { categoryName: "Einkauf", defaultSelected: true },
  { categoryName: "Wartung", defaultSelected: false },
  { categoryName: "Auto", defaultSelected: false },
  { categoryName: "Pflanzen", defaultSelected: false },
  { categoryName: "Gesundheit", defaultSelected: false },
] as const;

export function findTemplate(key: string): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find((t) => t.key === key);
}
