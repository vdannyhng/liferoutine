"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { getClock } from "@/server/clock";
import { toActionResult, type ActionResult } from "@/server/errors";
import * as service from "./service";

function refresh() {
  revalidatePath("/", "layout");
}

export async function addShoppingItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    const item = await service.addShoppingItem(prisma, userId, input);
    refresh();
    return { id: item.id };
  }, "Artikel konnte nicht hinzugefügt werden.");
}

export async function updateShoppingItemAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.updateShoppingItem(prisma, userId, input);
    refresh();
    return undefined;
  });
}

export async function toggleShoppingItemAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.toggleShoppingItem(prisma, userId, await getClock(userId), input);
    refresh();
    return undefined;
  });
}

export async function deleteShoppingItemAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.deleteShoppingItem(prisma, userId, input);
    refresh();
    return undefined;
  });
}

export async function completeShoppingAction(): Promise<ActionResult<{ itemCount: number }>> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    const session = await service.completeShopping(prisma, userId, await getClock(userId));
    refresh();
    return { itemCount: session.itemCount };
  });
}
