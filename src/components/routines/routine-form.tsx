"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, fieldA11y, Input, Select, Textarea } from "@/components/ui/form";
import { AppIcon } from "@/components/ui/icon";
import { ICON_KEYS } from "@/domain/icons";
import {
  INTERVAL_UNITS,
  MAX_WEEK_INTERVAL,
  PRIORITIES,
  REMINDER_OFFSETS,
  ROUTINE_TYPES,
  type RoutineType,
} from "@/domain/routines/schedule";
import { ROUTINE_TEMPLATES, type RoutineTemplate } from "@/domain/routines/templates";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { routineInputSchema, TITLE_MAX_LENGTH } from "@/lib/validation/routine";
import { createRoutineAction, updateRoutineAction } from "@/server/routines/actions";
import {
  formValuesToInput,
  scheduleToFormValues,
  supportsReminder,
  type RoutineFormValues,
} from "./form-values";

interface CategoryOption {
  id: string;
  name: string;
}

interface RoutineFormProps {
  mode: "create" | "edit";
  routineId?: string;
  categories: CategoryOption[];
  initialValues: RoutineFormValues;
}

type Errors = Record<string, string>;

export function RoutineForm({ mode, routineId, categories, initialValues }: RoutineFormProps) {
  const router = useRouter();
  const id = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof RoutineFormValues>(key: K, value: RoutineFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function applyTemplate(template: RoutineTemplate) {
    const categoryId = categories.find((c) => c.name === template.categoryName)?.id ?? "";
    setValues((current) =>
      scheduleToFormValues(template.schedule, { ...current, title: template.title, icon: template.icon, categoryId }),
    );
    setErrors({});
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const input = formValuesToInput(values);
    const parsed = routineInputSchema.safeParse(input);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const result =
        mode === "edit" && routineId
          ? await updateRoutineAction({ ...input, id: routineId })
          : await createRoutineAction(input);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      toast.success(mode === "edit" ? de.toast.saved : `${input.title.trim()} erstellt`);
      router.push(mode === "edit" ? `/routinen/${result.data.id}` : "/");
    } catch {
      setFormError(de.errors.saveRoutine);
    } finally {
      setSubmitting(false);
    }
  }

  const fid = (name: string) => `${id}-${name}`;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {mode === "create" ? <TemplatePicker onPick={applyTemplate} /> : null}

      <Field label="Titel" htmlFor={fid("title")} error={errors.title}>
        <Input
          {...fieldA11y(fid("title"), errors.title)}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="z. B. Staubsaugen"
          autoComplete="off"
          required
          autoFocus={mode === "create"}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Kategorie" htmlFor={fid("category")}>
          <Select id={fid("category")} value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">Ohne Kategorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Rhythmus" htmlFor={fid("type")}>
          <Select
            id={fid("type")}
            value={values.type}
            onChange={(e) => set("type", e.target.value as RoutineType)}
          >
            {ROUTINE_TYPES.map((type) => (
              <option key={type} value={type}>
                {de.types[type]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <ScheduleFields values={values} set={set} errors={errors} fid={fid} />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Priorität" htmlFor={fid("priority")}>
          <Select
            id={fid("priority")}
            value={values.priority}
            onChange={(e) => set("priority", e.target.value as RoutineFormValues["priority"])}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {de.priority[priority]}
              </option>
            ))}
          </Select>
        </Field>
        {supportsReminder(values.type) ? (
          <Field
            label="Erinnerung"
            htmlFor={fid("reminder")}
            hint="Bestimmt, ab wann die Routine unter „Heute“ erscheint."
          >
            <Select
              id={fid("reminder")}
              value={values.reminder}
              onChange={(e) => set("reminder", e.target.value as RoutineFormValues["reminder"])}
            >
              {REMINDER_OFFSETS.map((offset) => (
                <option key={offset} value={offset}>
                  {de.reminder[offset]}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <details className="group rounded-2xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-medium select-none">Weitere Angaben (optional)</summary>
        <div className="mt-4 space-y-6">
          <IconPicker value={values.icon} onChange={(icon) => set("icon", icon)} />
          <Field label="Beschreibung" htmlFor={fid("description")} error={errors.description}>
            <Textarea
              {...fieldA11y(fid("description"), errors.description)}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={500}
            />
          </Field>
          <Field label="Geschätzte Dauer (Minuten)" htmlFor={fid("minutes")} error={errors.estimatedMinutes}>
            <Input
              {...fieldA11y(fid("minutes"), errors.estimatedMinutes)}
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              value={values.estimatedMinutes}
              onChange={(e) => set("estimatedMinutes", e.target.value)}
              className="max-w-40"
            />
          </Field>
        </div>
      </details>

      {formError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-overdue-soft p-3 text-sm text-overdue">
          <span>{formError}</span>
          <Button type="submit" variant="secondary" size="sm">
            {de.actions.retry}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => router.back()}>
          {de.actions.cancel}
        </Button>
        <Button type="submit" disabled={submitting}>
          {mode === "edit" ? de.actions.save : values.type === "ONE_OFF" ? "Aufgabe erstellen" : "Routine erstellen"}
        </Button>
      </div>
    </form>
  );
}

interface ScheduleFieldsProps {
  values: RoutineFormValues;
  set: <K extends keyof RoutineFormValues>(key: K, value: RoutineFormValues[K]) => void;
  errors: Errors;
  fid: (name: string) => string;
}

function ScheduleFields({ values, set, errors, fid }: ScheduleFieldsProps) {
  switch (values.type) {
    case "INTERVAL":
      return (
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium">Alle</legend>
          <div className="flex gap-2">
            <Input
              {...fieldA11y(fid("interval"), errors["schedule.value"])}
              aria-label="Anzahl"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={values.intervalValue}
              onChange={(e) => set("intervalValue", e.target.value)}
              className="w-24"
            />
            <Select
              aria-label="Einheit"
              value={values.intervalUnit}
              onChange={(e) => set("intervalUnit", e.target.value as RoutineFormValues["intervalUnit"])}
              className="w-40"
            >
              {INTERVAL_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {de.units[unit]}
                </option>
              ))}
            </Select>
          </div>
          {errors["schedule.value"] ? (
            <p id={`${fid("interval")}-error`} className="text-sm text-overdue">
              {errors["schedule.value"]}
            </p>
          ) : null}
        </fieldset>
      );
    case "WEEKLY_GOAL":
      return (
        <Field label="Wie oft pro Woche?" htmlFor={fid("target")} error={errors["schedule.targetCount"]}>
          <div className="flex items-center gap-2">
            <Input
              {...fieldA11y(fid("target"), errors["schedule.targetCount"])}
              type="number"
              inputMode="numeric"
              min={1}
              max={14}
              value={values.targetCount}
              onChange={(e) => set("targetCount", e.target.value)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">× pro Woche (Mo–So)</span>
          </div>
        </Field>
      );
    case "FIXED_SCHEDULE":
      return (
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Wochentage</legend>
            <div className="flex flex-wrap gap-2">
              {de.weekdaysShort.map((label, index) => {
                const day = index + 1;
                const checked = values.weekdays.includes(day);
                return (
                  <label
                    key={day}
                    className={cn(
                      "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                      checked ? "border-foreground bg-foreground text-background" : "border-border bg-surface",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      aria-label={de.weekdaysLong[index]}
                      onChange={() =>
                        set("weekdays", checked ? values.weekdays.filter((d) => d !== day) : [...values.weekdays, day])
                      }
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            {errors["schedule.weekdays"] ? (
              <p className="mt-1.5 text-sm text-overdue">{errors["schedule.weekdays"]}</p>
            ) : null}
          </fieldset>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Uhrzeit (optional)" htmlFor={fid("time")} error={errors["schedule.time"]}>
              <Input
                {...fieldA11y(fid("time"), errors["schedule.time"])}
                type="time"
                value={values.time}
                onChange={(e) => set("time", e.target.value)}
              />
            </Field>
            <Field label="Wiederholung" htmlFor={fid("weeks")}>
              <Select id={fid("weeks")} value={values.everyNWeeks} onChange={(e) => set("everyNWeeks", e.target.value)}>
                {Array.from({ length: MAX_WEEK_INTERVAL }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>
                    {n === 1 ? "Jede Woche" : `Jede ${n}. Woche`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {Number(values.everyNWeeks) > 1 ? (
            <Field
              label="Ein Termin liegt in der Woche vom"
              htmlFor={fid("start")}
              error={errors["schedule.startDate"]}
              hint="Ab dieser Woche wird jede n-te Woche gezählt."
            >
              <Input
                {...fieldA11y(fid("start"), errors["schedule.startDate"])}
                type="date"
                value={values.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
          ) : null}
        </div>
      );
    case "ONE_OFF":
      return (
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Fällig am" htmlFor={fid("due")} error={errors["schedule.dueDate"]}>
            <Input
              {...fieldA11y(fid("due"), errors["schedule.dueDate"])}
              type="date"
              value={values.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              required
            />
          </Field>
          <Field label="Uhrzeit (optional)" htmlFor={fid("dueTime")} error={errors["schedule.dueTime"]}>
            <Input
              {...fieldA11y(fid("dueTime"), errors["schedule.dueTime"])}
              type="time"
              value={values.dueTime}
              onChange={(e) => set("dueTime", e.target.value)}
            />
          </Field>
        </div>
      );
    case "MANUAL":
      return (
        <p className="rounded-xl bg-surface-muted p-3 text-sm text-muted-foreground">
          Keine feste Fälligkeit. Die App zeigt dir, wie lange es her ist, dass du sie zuletzt erledigt hast.
        </p>
      );
  }
}

function TemplatePicker({ onPick }: { onPick: (template: RoutineTemplate) => void }) {
  return (
    <section aria-labelledby="templates-heading">
      <h2 id="templates-heading" className="mb-2 text-sm font-medium">
        Vorlage verwenden
      </h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {ROUTINE_TEMPLATES.map((template) => (
          <button
            key={template.key}
            type="button"
            onClick={() => onPick(template)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm hover:bg-surface-muted"
          >
            <AppIcon name={template.icon} className="size-4 text-muted-foreground" />
            {template.title}
          </button>
        ))}
      </div>
    </section>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: RoutineFormValues["icon"]) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Icon</legend>
      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
        <IconOption label="Icon der Kategorie" checked={value === ""} onSelect={() => onChange("")}>
          <span className="text-xs">Auto</span>
        </IconOption>
        {ICON_KEYS.map((key) => (
          <IconOption key={key} label={de.icons[key]} checked={value === key} onSelect={() => onChange(key)}>
            <AppIcon name={key} className="size-5" />
          </IconOption>
        ))}
      </div>
    </fieldset>
  );
}

function IconOption({
  label,
  checked,
  onSelect,
  children,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      title={label}
      className={cn(
        "inline-flex size-11 cursor-pointer items-center justify-center rounded-xl border has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
        checked ? "border-foreground bg-surface-muted" : "border-transparent hover:bg-surface-muted",
      )}
    >
      <input type="radio" name="icon" className="sr-only" checked={checked} onChange={onSelect} aria-label={label} />
      {children}
    </label>
  );
}
