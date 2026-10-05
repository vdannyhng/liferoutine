import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

export const getSettings = cache(async (userId: string) => {
  const [settings, user] = await Promise.all([
    prisma.appSettings.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ]);
  return {
    theme: settings?.theme ?? "SYSTEM",
    timezone: settings?.timezone ?? null,
    onboardingCompleted: Boolean(settings?.onboardingCompletedAt),
    name: user?.name ?? null,
    email: user?.email ?? null,
  };
});
