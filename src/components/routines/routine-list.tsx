"use client";

import { Repeat, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Chip, EmptyState } from "@/components/ui/misc";
import type { RoutineListItem } from "@/server/routines/queries";
import { RoutineRow } from "./routine-card";
import { useOptimisticCompletion } from "./use-optimistic-completion";

const SORTS = {
  relevance: "Nach Relevanz",
  alpha: "Alphabetisch",
  category: "Kategorie",
  lastDone: "Zuletzt erledigt",
  nextDue: "Nächste Fälligkeit",
} as const;
type SortKey = keyof typeof SORTS;

const UNRANKED = Number.MAX_SAFE_INTEGER;

const byTitle = (a: RoutineListItem, b: RoutineListItem) => a.title.localeCompare(b.title, "de");
const nullsLast = (a: number | null, b: number | null, direction: 1 | -1) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : (a - b) * direction;

const COMPARATORS: Record<SortKey, (a: RoutineListItem, b: RoutineListItem) => number> = {
  relevance: (a, b) =>
    (a.rank ?? UNRANKED) - (b.rank ?? UNRANKED) || nullsLast(a.nextDueAt, b.nextDueAt, 1) || byTitle(a, b),
  alpha: byTitle,
  category: (a, b) => (a.categoryName ?? "~").localeCompare(b.categoryName ?? "~", "de") || byTitle(a, b),
  lastDone: (a, b) => nullsLast(a.lastDoneAt, b.lastDoneAt, -1) || byTitle(a, b),
  nextDue: (a, b) => nullsLast(a.nextDueAt, b.nextDueAt, 1) || byTitle(a, b),
};

function matches(routine: RoutineListItem, query: string) {
  const q = query.trim().toLocaleLowerCase("de");
  if (!q) return true;
  return [routine.title, routine.categoryName, routine.description].some((text) =>
    text?.toLocaleLowerCase("de").includes(q),
  );
}

export function RoutineList({ routines }: { routines: RoutineListItem[] }) {
  const { pending, complete } = useOptimisticCompletion();
  const [category, setCategory] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("relevance");

  const categories = useMemo(() => {
    const names = new Map<string, string>();
    for (const r of routines) if (r.categoryId && r.categoryName) names.set(r.categoryId, r.categoryName);
    return [...names].sort((a, b) => a[1].localeCompare(b[1], "de"));
  }, [routines]);
  const pausedCount = routines.filter((r) => r.isPaused).length;

  const visible = routines
    .filter((r) => r.isPaused === showPaused)
    .filter((r) => !category || r.categoryId === category)
    .filter((r) => matches(r, query))
    .sort(COMPARATORS[sort]);

  if (routines.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Noch keine Routinen"
        description="Erstelle deine erste Routine und lass dir automatisch anzeigen, wann sie wieder ansteht."
        action={
          <Link href="/routinen/neu" className={buttonVariants()}>
            Routine erstellen
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Routinen durchsuchen"
            placeholder="Suchen …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Sortierung"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="sm:w-56"
        >
          {Object.entries(SORTS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Kategorie filtern">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          Alle
        </Chip>
        {categories.map(([id, name]) => (
          <Chip key={id} active={category === id} onClick={() => setCategory(category === id ? null : id)}>
            {name}
          </Chip>
        ))}
      </div>

      <div className="flex gap-2" role="group" aria-label="Status filtern">
        <Chip active={!showPaused} onClick={() => setShowPaused(false)}>
          Aktiv
        </Chip>
        <Chip active={showPaused} onClick={() => setShowPaused(true)}>
          Pausiert{pausedCount > 0 ? ` (${pausedCount})` : ""}
        </Chip>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {showPaused ? "Keine pausierten Routinen." : "Keine Routinen gefunden."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface px-4" aria-live="polite">
          {visible.map((routine) => (
            <RoutineRow
              key={routine.id}
              routine={routine}
              detail={[
                routine.scheduleLabel,
                pending.has(routine.id) ? "Erledigt" : routine.weekly ? `${routine.weekly.completed}/${routine.weekly.target} diese Woche` : routine.statusLabel,
              ].join(" · ")}
              onComplete={complete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
