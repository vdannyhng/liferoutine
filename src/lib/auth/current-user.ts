import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { ensureUserDefaults } from "@/server/bootstrap";

const DEFAULT_DEV_EMAIL = "dev@routine.local";

/**
 * Returns the id of the signed-in user.
 *
 * Version 1 runs as a single development user (DEV_USER_EMAIL). Real
 * authentication (magic link / OAuth) plugs in here; nothing else in the app
 * knows how the user was identified.
 */
export const getCurrentUserId = cache(async (): Promise<string> => {
  const email = process.env.DEV_USER_EMAIL ?? DEFAULT_DEV_EMAIL;
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: null },
    select: { id: true },
  });
  await ensureUserDefaults(prisma, user.id);
  return user.id;
});
