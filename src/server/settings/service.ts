import type { Prisma } from "@prisma/client";
import { scheduleSchema } from "@/domain/routines/schedule";
import { findTemplate } from "@/domain/routines/templates";
import type { Clock } from "@/domain/routines/types";
import type { Db } from "@/lib/db/prisma";
import {
  categoryIdSchema,
  categoryInputSchema,
  onboardingSchema,
  updateCategorySchema,
  updateSettingsSchema,
} from "@/lib/validation/settings";
import { DomainError } from "@/server/errors";

export async function updateSettings(db: Db, userId: string, raw: unknown) {
  const { name, ...settings } = updateSettingsSchema.parse(raw);
  if (name !== undefined) {
    await db.user.update({ where: { id: userId }, data: { name: name || null } });
  }
  return db.appSettings.upsert({
    where: { userId },
    update: settings,
    create: { userId, ...settings },
  });
}

async function assertUniqueName(db: Db, userId: string, name: string, exceptId?: string) {
  const clash = await db.category.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" }, NOT: exceptId ? { id: exceptId } : undefined },
    select: { id: true },
  });
  if (clash) throw new DomainError("Eine Kategorie mit diesem Namen gibt es schon.", "CONFLICT");
}

export async function createCategory(db: Db, userId: string, raw: unknown) {
  const input = categoryInputSchema.parse(raw);
  await assertUniqueName(db, userId, input.name);
  const last = await db.category.findFirst({ where: { userId }, orderBy: { sortOrder: "desc" } });
  return db.category.create({ data: { userId, ...input, sortOrder: (last?.sortOrder ?? -1) + 1 } });
}

export async function updateCategory(db: Db, userId: string, raw: unknown) {
  const { id, ...input } = updateCategorySchema.parse(raw);
  const category = await db.category.findFirst({ where: { id, userId } });
  if (!category) throw new DomainError("Kategorie wurde nicht gefunden.", "NOT_FOUND");
  await assertUniqueName(db, userId, input.name, id);
  return db.category.update({ where: { id }, data: input });
}

/** Routines of a deleted category keep existing without category. */
export async function deleteCategory(db: Db, userId: string, raw: unknown) {
  const { id } = categoryIdSchema.parse(raw);
  const result = await db.category.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new DomainError("Kategorie wurde nicht gefunden.", "NOT_FOUND");
}

/** Creates the routines picked in onboarding and marks onboarding as done. */
export async function completeOnboarding(db: Db, userId: string, clock: Clock, raw: unknown) {
  const { templateKeys } = onboardingSchema.parse(raw);
  const categories = await db.category.findMany({ where: { userId }, select: { id: true, name: true } });
  const categoryId = (name: string) => categories.find((c) => c.name === name)?.id ?? null;
  const templates = [...new Set(templateKeys)].flatMap((key) => {
    const template = findTemplate(key);
    return template ? [template] : [];
  });
  await db.$transaction([
    db.routine.createMany({
      data: templates.map((template) => {
        const schedule = scheduleSchema.parse(template.schedule);
        return {
          userId,
          title: template.title,
          icon: template.icon,
          categoryId: categoryId(template.categoryName),
          type: schedule.type,
          scheduleConfig: schedule as Prisma.InputJsonObject,
          reminderConfig: { offset: "NONE" },
        };
      }),
    }),
    db.appSettings.upsert({
      where: { userId },
      update: { onboardingCompletedAt: clock.now },
      create: { userId, onboardingCompletedAt: clock.now },
    }),
  ]);
  return templates.length;
}

/** Everything stored for the user, for the JSON export. */
export async function exportUserData(db: Db, userId: string, clock: Clock) {
  const [user, settings, categories, routines, completions, shoppingItems, shoppingSessions] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.appSettings.findUnique({ where: { userId } }),
    db.category.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
    db.routine.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.routineCompletion.findMany({ where: { userId }, orderBy: { completedAt: "asc" } }),
    db.shoppingItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.shoppingSession.findMany({ where: { userId }, orderBy: { completedAt: "asc" } }),
  ]);
  return {
    exportedAt: clock.now.toISOString(),
    timeZone: clock.timeZone,
    formatVersion: 1,
    user,
    settings,
    categories,
    routines,
    completions,
    shoppingItems,
    shoppingSessions,
  };
}
