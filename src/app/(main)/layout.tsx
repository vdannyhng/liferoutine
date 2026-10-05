import type { ReactNode } from "react";
import { ClockProvider } from "@/components/layout/clock-context";
import { BottomNav, MobileTopBar, Sidebar } from "@/components/layout/navigation";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { toLocalDateKey } from "@/lib/dates/zoned";
import { getClock } from "@/server/clock";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const clock = await getClock(await getCurrentUserId());
  return (
    <ClockProvider value={{ timeZone: clock.timeZone, todayKey: toLocalDateKey(clock.now, clock.timeZone) }}>
      <a
        href="#inhalt"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Zum Inhalt springen
      </a>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <MobileTopBar />
          <main id="inhalt" className="mx-auto w-full max-w-5xl px-4 pt-2 pb-28 sm:px-6 md:pt-10 md:pb-12 lg:px-10">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </ClockProvider>
  );
}
