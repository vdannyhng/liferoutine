"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import {
  addLocalDays,
  localDateToInstant,
  toLocalDateKey,
  type TimeZone,
} from "@/lib/dates/zoned";

interface ClockContextValue {
  timeZone: TimeZone;
  /** Today's local date ("YYYY-MM-DD") as determined on the server. */
  todayKey: string;
}

const ClockContext = createContext<ClockContextValue | null>(null);

const TIME_ZONE_COOKIE = "tz";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function ClockProvider({ value, children }: { value: ClockContextValue; children: ReactNode }) {
  const router = useRouter();

  // Tell the server the browser's time zone; refresh once if it differs.
  useEffect(() => {
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie.split("; ").find((c) => c.startsWith(`${TIME_ZONE_COOKIE}=`));
    const stored = current ? decodeURIComponent(current.split("=")[1] ?? "") : null;
    if (browserZone && stored !== browserZone) {
      document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(browserZone)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
      router.refresh();
    }
  }, [router]);

  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export function useClock() {
  const value = useContext(ClockContext);
  if (!value) throw new Error("useClock must be used inside ClockProvider");
  return {
    ...value,
    /** Local date key `days` after today. */
    dayFromToday(days: number): string {
      const today = localDateToInstant(value.todayKey, value.timeZone);
      return toLocalDateKey(addLocalDays(today, days, value.timeZone), value.timeZone);
    },
  };
}
