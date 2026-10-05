import type { Clock } from "@/domain/routines/types";
import type { Db } from "@/lib/db/prisma";
import {
  shoppingItemIdSchema,
  shoppingItemInputSchema,
  toggleShoppingItemSchema,
  updateShoppingItemSchema,
} from "@/lib/validation/shopping";
import { DomainError } from "@/server/errors";

async function findOwnItem(db: Db, userId: string, id: string) {
  const item = await db.shoppingItem.findFirst({ where: { id, userId, archivedAt: null } });
  if (!item) throw new DomainError("Artikel wurde nicht gefunden.", "NOT_FOUND");
  return item;
}

export async function addShoppingItem(db: Db, userId: string, raw: unknown) {
  const input = shoppingItemInputSchema.parse(raw);
  return db.shoppingItem.create({ data: { userId, ...input } });
}

export async function updateShoppingItem(db: Db, userId: string, raw: unknown) {
  const { id, ...input } = updateShoppingItemSchema.parse(raw);
  await findOwnItem(db, userId, id);
  return db.shoppingItem.update({ where: { id }, data: input });
}

export async function toggleShoppingItem(db: Db, userId: string, clock: Clock, raw: unknown) {
  const { id, checked } = toggleShoppingItemSchema.parse(raw);
  await findOwnItem(db, userId, id);
  return db.shoppingItem.update({
    where: { id },
    data: { isChecked: checked, checkedAt: checked ? clock.now : null },
  });
}

export async function deleteShoppingItem(db: Db, userId: string, raw: unknown) {
  const { id } = shoppingItemIdSchema.parse(raw);
  await findOwnItem(db, userId, id);
  await db.shoppingItem.delete({ where: { id } });
}

/** Archives checked items as one shopping session; unchecked items stay on the list. */
export async function completeShopping(db: Db, userId: string, clock: Clock) {
  return db.$transaction(async (tx) => {
    const checked = await tx.shoppingItem.findMany({
      where: { userId, archivedAt: null, isChecked: true },
      select: { id: true, checkedAt: true },
    });
    if (checked.length === 0) throw new DomainError("Es sind noch keine Artikel abgehakt.");
    const startedAt = checked.reduce<Date>(
      (earliest, item) => (item.checkedAt && item.checkedAt < earliest ? item.checkedAt : earliest),
      clock.now,
    );
    const session = await tx.shoppingSession.create({
      data: { userId, startedAt, completedAt: clock.now, itemCount: checked.length },
    });
    await tx.shoppingItem.updateMany({
      where: { id: { in: checked.map((item) => item.id) } },
      data: { archivedAt: clock.now, sessionId: session.id },
    });
    return session;
  });
}
