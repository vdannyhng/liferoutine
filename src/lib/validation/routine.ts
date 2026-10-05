import { z } from "zod";
import "./error-map";
import { ICON_KEYS } from "@/domain/icons";
import {
  localDateSchema,
  PRIORITIES,
  reminderConfigSchema,
  scheduleSchema,
} from "@/domain/routines/schedule";

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 500;
export const NOTE_MAX_LENGTH = 500;
export const MAX_MINUTES = 24 * 60;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximal ${max} Zeichen`)
    .nullish()
    .transform((value) => (value ? value : null));

const optionalMinutes = z.number().int().min(1).max(MAX_MINUTES).nullish().transform((v) => v ?? null);

const id = z.string().min(1).max(64);

export const routineInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Bitte gib einen Titel ein")
    .max(TITLE_MAX_LENGTH, `Maximal ${TITLE_MAX_LENGTH} Zeichen`),
  description: optionalText(DESCRIPTION_MAX_LENGTH),
  categoryId: id.nullish().transform((v) => v ?? null),
  icon: z.enum(ICON_KEYS).nullish().transform((v) => v ?? null),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  schedule: scheduleSchema,
  reminder: reminderConfigSchema.default({ offset: "NONE" }),
  estimatedMinutes: optionalMinutes,
});
export type RoutineInput = z.input<typeof routineInputSchema>;
export type ValidRoutineInput = z.output<typeof routineInputSchema>;

export const updateRoutineSchema = routineInputSchema.extend({ id });

export const routineIdSchema = z.object({ routineId: id });

export const completeRoutineSchema = z.object({
  routineId: id,
  /** Local date for backdated entries; omitted = now. */
  date: localDateSchema.optional(),
  durationMinutes: optionalMinutes,
  note: optionalText(NOTE_MAX_LENGTH),
});
export type CompleteRoutineInput = z.input<typeof completeRoutineSchema>;

export const completionIdSchema = z.object({ completionId: id });

export const snoozeRoutineSchema = z.object({ routineId: id, until: localDateSchema });

export const resumeRoutineSchema = z.object({
  routineId: id,
  mode: z.enum(["continue", "restart"]),
});

export const deleteRoutineSchema = z.object({ routineId: id, deleteHistory: z.boolean().default(false) });
