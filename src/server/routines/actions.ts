"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { de } from "@/lib/i18n/de";
import { getClock } from "@/server/clock";
import { toActionResult, type ActionResult } from "@/server/errors";
import * as service from "./service";

function refresh() {
  revalidatePath("/", "layout");
}

export async function createRoutineAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    const routine = await service.createRoutine(prisma, userId, input);
    refresh();
    return { id: routine.id };
  }, de.errors.saveRoutine);
}

export async function updateRoutineAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    const routine = await service.updateRoutine(prisma, userId, input);
    refresh();
    return { id: routine.id };
  }, de.errors.saveRoutine);
}

export async function deleteRoutineAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.deleteRoutine(prisma, userId, input);
    refresh();
    return undefined;
  });
}

export async function completeRoutineAction(input: unknown): Promise<ActionResult<{ completionId: string }>> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    const { completion } = await service.completeRoutine(prisma, userId, await getClock(userId), input);
    refresh();
    return { completionId: completion.id };
  });
}

export async function skipRoutineAction(input: unknown): Promise<ActionResult<{ completionId: string }>> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    const { completion } = await service.skipRoutine(prisma, userId, await getClock(userId), input);
    refresh();
    return { completionId: completion.id };
  });
}

export async function undoCompletionAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.undoCompletion(prisma, userId, await getClock(userId), input);
    refresh();
    return undefined;
  });
}

export async function deleteCompletionAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.deleteCompletion(prisma, userId, input);
    refresh();
    return undefined;
  });
}

export async function snoozeRoutineAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.snoozeRoutine(prisma, userId, await getClock(userId), input);
    refresh();
    return undefined;
  });
}

export async function pauseRoutineAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.pauseRoutine(prisma, userId, await getClock(userId), input);
    refresh();
    return undefined;
  });
}

export async function resumeRoutineAction(input: unknown): Promise<ActionResult> {
  return toActionResult(async () => {
    const userId = await getCurrentUserId();
    await service.resumeRoutine(prisma, userId, await getClock(userId), input);
    refresh();
    return undefined;
  });
}
