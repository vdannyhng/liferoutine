import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getUserTimeZone } from "@/server/clock";
import { getSettings } from "@/server/settings/queries";

export const metadata: Metadata = { title: "Willkommen" };

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  const settings = await getSettings(userId);
  if (settings.onboardingCompleted) redirect("/");
  return <OnboardingFlow timeZone={await getUserTimeZone(userId)} />;
}
