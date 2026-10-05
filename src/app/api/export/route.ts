import { getCurrentUserId } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { toLocalDateKey } from "@/lib/dates/zoned";
import { getClock } from "@/server/clock";
import { exportUserData } from "@/server/settings/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  const clock = await getClock(userId);
  const data = await exportUserData(prisma, userId, clock);
  const filename = `routine-export-${toLocalDateKey(clock.now, clock.timeZone)}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
