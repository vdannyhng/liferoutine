import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PageHeader } from "@/components/ui/misc";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { formatDate, greeting } from "@/lib/i18n/format";
import { getClock } from "@/server/clock";
import { getDashboardData } from "@/server/routines/queries";
import { getSettings } from "@/server/settings/queries";

export default async function TodayPage() {
  const userId = await getCurrentUserId();
  const settings = await getSettings(userId);
  if (!settings.onboardingCompleted) redirect("/onboarding");

  const clock = await getClock(userId);
  const data = await getDashboardData(userId, clock);
  const date = formatDate(clock.now, clock.timeZone, "weekday");
  const doneToday =
    data.doneToday > 0 ? ` · Heute ${data.doneToday === 1 ? "1 Routine" : `${data.doneToday} Routinen`} erledigt` : "";

  return (
    <>
      <PageHeader
        title={settings.name ? `${greeting(clock.now, clock.timeZone)}, ${settings.name}` : greeting(clock.now, clock.timeZone)}
        subtitle={`${date}${doneToday}`}
      />
      <DashboardView data={data} />
    </>
  );
}
