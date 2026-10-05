import { DEFAULT_CATEGORIES } from "@/domain/categories/defaults";
import type { Db } from "@/lib/db/prisma";

/** Creates default categories and settings for a user if they are missing. */
export async function ensureUserDefaults(db: Db, userId: string): Promise<void> {
  const existing = await db.category.count({ where: { userId } });
  if (existing === 0) {
    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((category, index) => ({
        userId,
        name: category.name,
        icon: category.icon,
        sortOrder: index,
        isDefault: true,
      })),
      skipDuplicates: true,
    });
  }
  await db.appSettings.upsert({ where: { userId }, update: {}, create: { userId } });
}
