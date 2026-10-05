import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompletionHistory, RoutineDetailActions } from "@/components/routines/routine-detail-actions";
import { IconTile } from "@/components/ui/icon";
import { Card, ProgressDots, StatusLine } from "@/components/ui/misc";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { de } from "@/lib/i18n/de";
import { getClock } from "@/server/clock";
import { getRoutineDetail, getRoutineForEdit } from "@/server/routines/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const routine = await getRoutineForEdit(await getCurrentUserId(), id);
  return { title: routine?.title ?? "Routine" };
}

const numberFormat = new Intl.NumberFormat(de.locale, { maximumFractionDigits: 1 });

export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const detail = await getRoutineDetail(userId, id, await getClock(userId));
  if (!detail) notFound();
  const { view, stats } = detail;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/routinen"
        className="-ml-2 inline-flex h-11 items-center gap-1 rounded-xl px-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> {de.nav.routines}
      </Link>

      <header className="flex items-start gap-4">
        <IconTile name={view.icon} className="size-14 rounded-2xl [&_svg]:size-7" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{view.title}</h1>
          <p className="text-muted-foreground">
            {[view.categoryName, view.scheduleLabel].filter(Boolean).join(" · ")}
          </p>
        </div>
      </header>

      {view.description ? <p className="whitespace-pre-line">{view.description}</p> : null}

      <Card className="space-y-4">
        <StatusLine tone={view.tone} label={view.statusLabel} />
        {view.weekly ? (
          <div className="flex items-center gap-3">
            <ProgressDots completed={view.weekly.completed} target={view.weekly.target} />
            <span className="text-sm text-muted-foreground">
              {de.status.weeklyProgress(view.weekly.completed, view.weekly.target)}
            </span>
          </div>
        ) : null}
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {detail.nextDueLabel ? (
            <div>
              <dt className="text-muted-foreground">Nächste Empfehlung</dt>
              <dd className="font-medium">{detail.nextDueLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Zuletzt erledigt</dt>
            <dd className="font-medium">{detail.lastDoneLabel ?? "Noch nie"}</dd>
          </div>
          {view.snoozedLabel ? (
            <div>
              <dt className="text-muted-foreground">Verschoben</dt>
              <dd className="font-medium">{view.snoozedLabel}</dd>
            </div>
          ) : null}
          {detail.estimatedMinutes ? (
            <div>
              <dt className="text-muted-foreground">Geschätzte Dauer</dt>
              <dd className="font-medium">{detail.estimatedMinutes} Minuten</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Priorität</dt>
            <dd className="font-medium">{de.priority[view.priority]}</dd>
          </div>
        </dl>
        <RoutineDetailActions routine={view} />
      </Card>

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-3 text-lg font-semibold">
          Statistik
        </h2>
        <Card>
          {stats.kind === "weekly" ? (
            <ul className="space-y-2 text-sm">
              {stats.weeks.map((week) => (
                <li key={week.label} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{week.label}</span>
                  <span className="flex items-center gap-3 font-medium">
                    <ProgressDots completed={week.completed} target={week.target} />
                    {week.completed} / {week.target}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Durchschnittlicher Abstand</dt>
                <dd className="font-medium">
                  {stats.averageGapDays === null ? "–" : `${numberFormat.format(stats.averageGapDays)} Tage`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Letzte 30 Tage</dt>
                <dd className="font-medium">{stats.last30Days}× erledigt</dd>
              </div>
            </dl>
          )}
        </Card>
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 text-lg font-semibold">
          Historie
        </h2>
        <Card className="py-2">
          <CompletionHistory entries={detail.history} />
        </Card>
      </section>
    </div>
  );
}
