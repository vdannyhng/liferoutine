import { z } from "zod";
import "./error-map";
import { ICON_KEYS } from "@/domain/icons";
import { isValidTimeZone } from "@/lib/dates/zoned";

export const updateSettingsSchema = z.object({
  theme: z.enum(["SYSTEM", "LIGHT", "DARK"]).optional(),
  /** null = follow the browser. */
  timezone: z
    .string()
    .refine(isValidTimeZone, "Unbekannte Zeitzone")
    .nullable()
    .optional(),
  name: z.string().trim().max(60).nullish(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib einen Namen ein").max(40, "Maximal 40 Zeichen"),
  icon: z.enum(ICON_KEYS),
});

export const updateCategorySchema = categoryInputSchema.extend({ id: z.string().min(1).max(64) });

export const categoryIdSchema = z.object({ id: z.string().min(1).max(64) });

export const onboardingSchema = z.object({
  templateKeys: z.array(z.string().min(1).max(40)).max(50),
});
