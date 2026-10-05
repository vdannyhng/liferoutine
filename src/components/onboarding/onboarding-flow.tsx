"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/icon";
import { scheduleSchema } from "@/domain/routines/schedule";
import { ONBOARDING_AREAS, ROUTINE_TEMPLATES } from "@/domain/routines/templates";
import { de } from "@/lib/i18n/de";
import { formatSchedule } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "@/server/settings/actions";

const STEPS = 3;

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function OnboardingFlow({ timeZone }: { timeZone: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [areas, setAreas] = useState(
    () => new Set<string>(ONBOARDING_AREAS.filter((a) => a.defaultSelected).map((a) => a.categoryName)),
  );
  const [templates, setTemplates] = useState(
    () => new Set(ROUTINE_TEMPLATES.filter((t) => t.suggested).map((t) => t.key)),
  );
  const [pending, setPending] = useState(false);

  const visibleTemplates = ROUTINE_TEMPLATES.filter((t) => areas.has(t.categoryName));
  const groups = [...new Set(visibleTemplates.map((t) => t.categoryName))];

  async function finish() {
    setPending(true);
    const keys = visibleTemplates.filter((t) => templates.has(t.key)).map((t) => t.key);
    try {
      const result = await completeOnboardingAction({ templateKeys: keys });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.replace("/");
    } catch {
      toast.error(de.toast.offline);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-8 flex gap-1.5" aria-label={`Schritt ${step + 1} von ${STEPS}`} role="img">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-border")} />
        ))}
      </div>

      {step === 0 ? (
        <div className="flex flex-1 flex-col">
          <h1 className="text-3xl font-semibold tracking-tight">Willkommen bei Routine</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Behalte Haushalt, Sport und Alltag im Blick, ohne jeden Tag alles neu planen zu müssen.
          </p>
          <div className="mt-auto pt-10">
            <Button size="lg" className="w-full" onClick={() => setStep(1)}>
              Los geht&apos;s
            </Button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">Was möchtest du im Blick behalten?</h1>
          <p className="mt-2 text-muted-foreground">Du kannst später jederzeit weitere Bereiche ergänzen.</p>
          <fieldset className="mt-6 grid gap-2">
            <legend className="sr-only">Bereiche</legend>
            {ONBOARDING_AREAS.map((area) => {
              const checked = areas.has(area.categoryName);
              return (
                <label
                  key={area.categoryName}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                    checked ? "border-foreground bg-surface" : "border-border bg-surface",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-[var(--primary)]"
                    checked={checked}
                    onChange={() => setAreas((s) => toggle(s, area.categoryName))}
                  />
                  <span className="font-medium">{area.categoryName}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="mt-auto flex gap-2 pt-10">
            <Button variant="secondary" size="lg" onClick={() => setStep(0)}>
              Zurück
            </Button>
            <Button size="lg" className="flex-1" onClick={() => setStep(2)}>
              Weiter
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-1 flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">Vorschläge für den Start</h1>
          <p className="mt-2 text-muted-foreground">Wähle aus, was zu dir passt. Rhythmus und Details kannst du später ändern.</p>
          <div className="mt-6 space-y-6">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Für die gewählten Bereiche gibt es keine Vorschläge. Du kannst eigene Routinen jederzeit anlegen.
              </p>
            ) : null}
            {groups.map((group) => (
              <fieldset key={group}>
                <legend className="mb-2 text-sm font-semibold text-muted-foreground">{group}</legend>
                <div className="grid gap-2">
                  {visibleTemplates
                    .filter((t) => t.categoryName === group)
                    .map((template) => {
                      const checked = templates.has(template.key);
                      return (
                        <label
                          key={template.key}
                          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
                        >
                          <input
                            type="checkbox"
                            className="size-5 accent-[var(--primary)]"
                            checked={checked}
                            onChange={() => setTemplates((s) => toggle(s, template.key))}
                          />
                          <AppIcon name={template.icon} className="size-5 text-muted-foreground" />
                          <span className="flex-1">
                            <span className="block font-medium">{template.title}</span>
                            <span className="block text-sm text-muted-foreground">
                              {formatSchedule(scheduleSchema.parse(template.schedule), timeZone)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="sticky bottom-0 mt-auto flex gap-2 bg-background pt-6 pb-2">
            <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
              Zurück
            </Button>
            <Button size="lg" className="flex-1" onClick={finish} disabled={pending}>
              <Check aria-hidden /> Zum Dashboard
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
