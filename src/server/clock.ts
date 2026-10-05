import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Clock } from "@/domain/routines/types";
import { prisma } from "@/lib/db/prisma";
import { FALLBACK_TIME_ZONE, isValidTimeZone, type TimeZone } from "@/lib/dates/zoned";

/** Cookie written by the browser with its IANA time zone. */
export const TIME_ZONE_COOKIE = "tz";

/** Explicit setting > browser zone (cookie) > fallback. */
export const getUserTimeZone = cache(async (userId: string): Promise<TimeZone> => {
  const settings = await prisma.appSettings.findUnique({ where: { userId }, select: { timezone: true } });
  if (settings?.timezone && isValidTimeZone(settings.timezone)) return settings.timezone;
  const fromBrowser = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  if (fromBrowser && isValidTimeZone(fromBrowser)) return fromBrowser;
  return FALLBACK_TIME_ZONE;
});

export async function getClock(userId: string): Promise<Clock> {
  return { now: new Date(), timeZone: await getUserTimeZone(userId) };
}
