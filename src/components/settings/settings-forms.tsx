"use client";

import { Monitor, Moon, Pencil, Plus, Sun, Trash2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { AppIcon } from "@/components/ui/icon";
import { ICON_KEYS, type IconKey } from "@/domain/icons";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/errors";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  updateSettingsAction,
} from "@/server/settings/actions";

async function run(action: () => Promise<ActionResult<unknown>>, success?: string): Promise<boolean> {
  try {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    if (success) toast.success(success);
    return true;
  } catch {
    toast.error(de.toast.offline);
    return false;
  }
}

export function ProfileForm({ name }: { name: string | null }) {
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("name") ?? "");
    startTransition(async () => void (await run(() => updateSettingsAction({ name: value }), de.toast.saved)));
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <Field label="Name (für die Begrüßung)" htmlFor="profile-name" className="flex-1">
        <Input id="profile-name" name="name" defaultValue={name ?? ""} maxLength={60} autoComplete="given-name" />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {de.actions.save}
      </Button>
    </form>
  );
}

const THEMES = [
  { value: "SYSTEM", label: "System", icon: Monitor, attribute: "system" },
  { value: "LIGHT", label: "Hell", icon: Sun, attribute: "light" },
  { value: "DARK", label: "Dunkel", icon: Moon, attribute: "dark" },
] as const;

export function ThemePicker({ theme }: { theme: (typeof THEMES)[number]["value"] }) {
  const [current, setCurrent] = useState(theme);
  function choose(option: (typeof THEMES)[number]) {
    const previous = current;
    setCurrent(option.value);
    document.documentElement.dataset.theme = option.attribute;
    void run(() => updateSettingsAction({ theme: option.value })).then((ok) => {
      if (!ok) {
        setCurrent(previous);
        document.documentElement.dataset.theme = THEMES.find((t) => t.value === previous)!.attribute;
      }
    });
  }
  return (
    <fieldset>
      <legend className="sr-only">Darstellung</legend>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((option) => {
          const Icon = option.icon;
          const checked = current === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                checked ? "border-foreground bg-surface-muted font-medium" : "border-border hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name="theme"
                className="sr-only"
                checked={checked}
                onChange={() => choose(option)}
              />
              <Icon className="size-5" aria-hidden />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const COMMON_TIME_ZONES = [
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Zurich",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Athens",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function TimezoneForm({ timezone, activeZone }: { timezone: string | null; activeZone: string }) {
  const [pending, startTransition] = useTransition();
  const zones = [...new Set([...COMMON_TIME_ZONES, ...(timezone ? [timezone] : [])])].sort();
  return (
    <Field
      label="Zeitzone"
      htmlFor="timezone"
      hint={`Aktuell verwendet: ${activeZone}. „Automatisch“ übernimmt die Zeitzone deines Browsers.`}
    >
      <Select
        id="timezone"
        defaultValue={timezone ?? ""}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value || null;
          startTransition(async () => void (await run(() => updateSettingsAction({ timezone: value }), de.toast.saved)));
        }}
      >
        <option value="">Automatisch</option>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </Select>
    </Field>
  );
}

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  routineCount: number;
}

export function CategoryManager({ categories }: { categories: CategoryItem[] }) {
  const [editing, setEditing] = useState<CategoryItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<CategoryItem | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <ul className="divide-y divide-border">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-3 py-1.5">
            <AppIcon name={category.icon} className="size-5 text-muted-foreground" />
            <span className="flex-1">
              {category.name}
              <span className="ml-2 text-sm text-muted-foreground">
                {category.routineCount === 1 ? "1 Routine" : `${category.routineCount} Routinen`}
              </span>
            </span>
            <Button variant="ghost" size="icon" aria-label={`${category.name} bearbeiten`} onClick={() => setEditing(category)}>
              <Pencil aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`${category.name} löschen`} onClick={() => setDeleting(category)}>
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="secondary" className="mt-3" onClick={() => setEditing("new")}>
        <Plus aria-hidden /> Kategorie hinzufügen
      </Button>

      {editing ? (
        <CategoryDialog category={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent
          title="Kategorie löschen?"
          description={
            deleting && deleting.routineCount > 0
              ? `Die ${deleting.routineCount === 1 ? "zugehörige Routine bleibt" : `${deleting.routineCount} zugehörigen Routinen bleiben`} erhalten, aber ohne Kategorie.`
              : "Die Kategorie wird entfernt."
          }
        >
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {de.actions.cancel}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (deleting && (await run(() => deleteCategoryAction({ id: deleting.id }), "Kategorie gelöscht"))) {
                    setDeleting(null);
                  }
                })
              }
            >
              {de.actions.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryDialog({ category, onClose }: { category: CategoryItem | null; onClose: () => void }) {
  const [icon, setIcon] = useState<IconKey>((category?.icon as IconKey) ?? "calendar");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    startTransition(async () => {
      const ok = await run(
        () => (category ? updateCategoryAction({ id: category.id, name, icon }) : createCategoryAction({ name, icon })),
        de.toast.saved,
      );
      if (ok) onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={category ? "Kategorie bearbeiten" : "Neue Kategorie"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" htmlFor="category-name">
            <Input id="category-name" name="name" defaultValue={category?.name ?? ""} required maxLength={40} />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Icon</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {ICON_KEYS.map((key) => (
                <label
                  key={key}
                  title={de.icons[key]}
                  className={cn(
                    "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                    icon === key ? "border-foreground bg-surface-muted" : "border-transparent hover:bg-surface-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="category-icon"
                    className="sr-only"
                    aria-label={de.icons[key]}
                    checked={icon === key}
                    onChange={() => setIcon(key)}
                  />
                  <AppIcon name={key} className="size-5" />
                </label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              {de.actions.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {de.actions.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
