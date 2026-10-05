import "server-only";
import { prisma } from "@/lib/db/prisma";

export interface ShoppingItemView {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  note: string | null;
  isChecked: boolean;
}

export async function getShoppingList(userId: string): Promise<ShoppingItemView[]> {
  return prisma.shoppingItem.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, quantity: true, unit: true, category: true, note: true, isChecked: true },
  });
}

/** Names of previously bought items, most frequent first, for quick re-adding. */
export async function getFrequentItems(userId: string, limit = 8): Promise<string[]> {
  const rows = await prisma.shoppingItem.groupBy({
    by: ["name"],
    where: { userId, archivedAt: { not: null } },
    _count: { name: true },
    orderBy: { _count: { name: "desc" } },
    take: limit,
  });
  return rows.map((row) => row.name);
}
