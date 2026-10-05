import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/layout/toaster";
import { ServiceWorkerRegistration } from "@/components/layout/service-worker";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { de } from "@/lib/i18n/de";
import { getSettings } from "@/server/settings/queries";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: de.appName, template: `%s · ${de.appName}` },
  description: "Haushalt, Sport und Alltag im Blick, ohne jeden Tag alles neu planen zu müssen.",
  applicationName: de.appName,
  appleWebApp: { capable: true, title: de.appName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#111213" },
  ],
};

/** Every page depends on the signed-in user's data, so nothing is prerendered. */
export const dynamic = "force-dynamic";

const THEME_ATTRIBUTE = { SYSTEM: "system", LIGHT: "light", DARK: "dark" } as const;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings(await getCurrentUserId());
  return (
    <html lang="de" data-theme={THEME_ATTRIBUTE[settings.theme]} suppressHydrationWarning>
      <body className="min-h-dvh">
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
