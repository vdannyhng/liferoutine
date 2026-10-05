import { z } from "zod";
import "./error-map";

export const SHOPPING_NAME_MAX_LENGTH = 100;
const MAX_QUANTITY = 10_000;

const optionalShortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximal ${max} Zeichen`)
    .nullish()
    .transform((value) => (value ? value : null));

export const shoppingItemInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Bitte gib einen Artikel ein")
    .max(SHOPPING_NAME_MAX_LENGTH, `Maximal ${SHOPPING_NAME_MAX_LENGTH} Zeichen`),
  quantity: z.number().positive().max(MAX_QUANTITY).nullish().transform((v) => v ?? null),
  unit: optionalShortText(20),
  category: optionalShortText(40),
  note: optionalShortText(200),
});
export type ShoppingItemInput = z.input<typeof shoppingItemInputSchema>;

export const updateShoppingItemSchema = shoppingItemInputSchema.extend({ id: z.string().min(1).max(64) });

export const toggleShoppingItemSchema = z.object({ id: z.string().min(1).max(64), checked: z.boolean() });

export const shoppingItemIdSchema = z.object({ id: z.string().min(1).max(64) });
