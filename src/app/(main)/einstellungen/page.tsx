import { Download } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  CategoryManager,
  ProfileForm,
  ThemePicker,
  TimezoneForm,
} from "@/components/settings/settings-forms";
import { buttonVariants } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/misc";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getUserTimeZone } from "@/server/clock";
import { getCategories } from "@/server/routines/queries";
import { getSettings } from "@/server/settings/queries";
import packageJson from "../../../../package.json";

export const metadata: Metadata = { title: "Einstellungen" };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      <Card>{children}</Card>
    </section>
  );
}

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  const [settings, categories, activeZone] = await Promise.all([
    getSettings(userId),
    getCategories(userId),
    getUserTimeZone(userId),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Einstellungen" />

      <Section id="profile" title="Profil">
        <div className="space-y-6">
          <ProfileForm name={settings.name} />
          <TimezoneForm timezone={settings.timezone} activeZone={activeZone} />
        </div>
      </Section>

      <Section id="appearance" title="Darstellung">
        <ThemePicker theme={settings.theme} />
      </Section>

      <Section id="categories" title="Kategorien">
        <CategoryManager
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            routineCount: c._count.routines,
          }))}
        />
      </Section>

      <Section id="data" title="Daten">
        <p className="mb-4 text-sm text-muted-foreground">
          Lade alle deine Routinen, Abschlüsse, Einkäufe und Einstellungen als JSON-Datei herunter.
        </p>
        <a href="/api/export" download className={buttonVariants({ variant: "secondary" })}>
          <Download aria-hidden /> Daten exportieren (JSON)
        </a>
      </Section>

      <Section id="about" title="Über die App">
        <p className="text-sm text-muted-foreground">
          Routine hilft dir, wiederkehrende Aufgaben im Blick zu behalten, ohne jeden Tag alles neu planen zu müssen.
          Version {packageJson.version}.
        </p>
      </Section>
    </div>
  );
}
