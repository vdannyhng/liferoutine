"use client";

import { ChevronRight, CircleCheck, Repeat, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/misc";
import { RoutineCard, RoutineRow } from "@/components/routines/routine-card";
import { useOptimisticCompletion } from "@/components/routines/use-optimistic-completion";
import { de } from "@/lib/i18n/de";
import type { DashboardData } from "@/server/routines/queries";
import type { RoutineView } from "@/server/routines/view";

export function DashboardView({ data }: { data: DashboardData }) {
  const { pending, complete } = useOptimisticCompletion();

  // Dated routines leave the list right away; weekly goals stay and count up.
  const visible = (items: RoutineView[]) => items.filter((r) => r.weekly || !pending.has(r.id));
  const overdue = visible(data.overdue);
  const today = visible(data.today);
  const week = data.week;
  const upcoming = data.upcoming.filter((r) => !pending.has(r.id));
  const showShopping = data.openShoppingItems > 0;

  if (data.isEmpty) {
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

  const nothingDue = overdue.length === 0 && today.length === 0 && !showShopping;

  const cards = (items: RoutineView[]) => (
    <ul className="grid gap-3 lg:grid-cols-2">
      {items.map((routine) => (
        <li key={routine.id} className="min-w-0">
          <RoutineCard routine={routine} pendingCount={pending.get(routine.id)} onComplete={complete} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-8">
      {overdue.length > 0 ? (
        <section aria-labelledby="section-overdue">
          <SectionHeading count={overdue.length}>
            <span id="section-overdue">{de.sections.overdue}</span>
          </SectionHeading>
          {cards(overdue)}
        </section>
      ) : null}

      <section aria-labelledby="section-today">
        <SectionHeading count={today.length + (showShopping ? 1 : 0) || undefined}>
          <span id="section-today">{de.sections.today}</span>
        </SectionHeading>
        {nothingDue ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
            <CircleCheck className="size-5 shrink-0 text-done" aria-hidden />
            <span>Für heute steht nichts Dringendes an.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {today.length > 0 ? cards(today) : null}
            {showShopping ? <ShoppingCard openItems={data.openShoppingItems} /> : null}
          </div>
        )}
      </section>

      {week.length > 0 ? (
        <section aria-labelledby="section-week">
          <SectionHeading>
            <span id="section-week">{de.sections.week}</span>
          </SectionHeading>
          {cards(week)}
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section aria-labelledby="section-upcoming">
          <SectionHeading>
            <span id="section-upcoming">{de.sections.upcoming}</span>
          </SectionHeading>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface px-4">
            {upcoming.map((routine) => (
              <RoutineRow
                key={routine.id}
                routine={routine}
                detail={routine.snoozedLabel ?? routine.relativeLabel}
                onComplete={complete}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ShoppingCard({ openItems }: { openItems: number }) {
  return (
    <Link
      href="/einkauf"
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card hover:bg-surface-muted"
    >
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-surface-muted">
        <ShoppingCart className="size-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">Einkaufen</span>
        <span className="block text-sm text-muted-foreground">
          {openItems === 1 ? "1 Artikel auf der Liste" : `${openItems} Artikel auf der Liste`}
        </span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </Link>
  );
}
