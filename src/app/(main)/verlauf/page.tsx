import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/icon";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";
import { getClock } from "@/server/clock";
import {
  getCategories,
  getHistory,
  HISTORY_FILTER_OTHER,
  HISTORY_FILTER_SHOPPING,
} from "@/server/routines/queries";

export const metadata: Metadata = { title: "Verlauf" };

const PAGE_SIZE = 50;
const MAX_LIMIT = 1000;
const RANGES = [
  { value: "7", label: "7 Tage" },
  { value: "30", label: "30 Tage" },
  { value: "90", label: "90 Tage" },
  { value: "alle", label: "Gesamt" },
] as const;

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hrefWith(params: { filter?: string; range?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params.filter) query.set("filter", params.filter);
  if (params.range && params.range !== "alle") query.set("zeitraum", params.range);
  if (params.limit && params.limit > PAGE_SIZE) query.set("anzahl", String(params.limit));
  const text = query.toString();
  return text ? `/verlauf?${text}` : "/verlauf";
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-surface-muted",
      )}
    >
      {children}
    </Link>
  );
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filter = single(params.filter);
  const range = RANGES.find((r) => r.value === single(params.zeitraum))?.value ?? "alle";
  const limit = Math.min(Math.max(Number(single(params.anzahl)) || PAGE_SIZE, PAGE_SIZE), MAX_LIMIT);

  const userId = await getCurrentUserId();
  const [clock, categories] = await Promise.all([getClock(userId), getCategories(userId)]);
  const { days, hasMore } = await getHistory(userId, clock, {
    filter,
    days: range === "alle" ? undefined : Number(range),
    limit,
  });

  const filters = [
    { value: undefined, label: "Alle" },
    ...categories
      .filter((c) => c.name !== "Einkauf")
      .map((c) => ({ value: c.id as string | undefined, label: c.name })),
    { value: HISTORY_FILTER_SHOPPING, label: "Einkauf" },
    { value: HISTORY_FILTER_OTHER, label: "Sonstige" },
  ];

  return (
    <>
      <PageHeader title="Verlauf" />
      <nav aria-label="Verlauf filtern" className="mb-6 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {filters.map((f) => (
            <FilterLink key={f.label} href={hrefWith({ filter: f.value, range })} active={filter === f.value}>
              {f.label}
            </FilterLink>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <FilterLink key={r.value} href={hrefWith({ filter, range: r.value })} active={range === r.value}>
              {r.label}
            </FilterLink>
          ))}
        </div>
      </nav>

      {days.length === 0 ? (
        <EmptyState
          icon={History}
          title="Noch nichts im Verlauf"
          description="Sobald du Routinen erledigst oder einen Einkauf abschließt, erscheint es hier."
        />
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.key} aria-label={day.label}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{day.label}</h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {day.items.map((item) => {
                  const content = (
                    <>
                      <span
                        className={cn(
                          "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
                          item.type === "skipped" ? "bg-surface-muted text-muted-foreground" : "bg-done-soft text-done",
                        )}
                      >
                        <AppIcon name={item.icon} className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {item.type === "skipped" ? `${item.title} (übersprungen)` : item.title}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {[item.categoryName, item.detail].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">{item.timeLabel}</span>
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {item.routineId ? (
                        <Link href={`/routinen/${item.routineId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted">
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {hasMore && limit < MAX_LIMIT ? (
            <div className="text-center">
              <Link
                href={hrefWith({ filter, range, limit: limit + PAGE_SIZE })}
                scroll={false}
                className={buttonVariants({ variant: "secondary" })}
              >
                Ältere Einträge laden
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
