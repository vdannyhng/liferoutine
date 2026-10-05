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

export async function updateSettingsAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.updateSettings(prisma, userId, input);
    refresh();
    return undefined;
  });
}

export async function createCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    const category = await service.createCategory(prisma, userId, input);
    refresh();
    return { id: category.id };
  });
}

export async function updateCategoryAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.updateCategory(prisma, userId, input);
    refresh();
    return undefined;
  });
}

export async function deleteCategoryAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.deleteCategory(prisma, userId, input);
    refresh();
    return undefined;
  });
}

export async function completeOnboardingAction(input: unknown): Promise<ActionResult<{ created: number }>> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    const created = await service.completeOnboarding(prisma, userId, await getClock(userId), input);
    refresh();
    return { created };
  });
}
