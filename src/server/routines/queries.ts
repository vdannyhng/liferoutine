import "server-only";
import { buildDashboard } from "@/domain/routines/dashboard";
import { calculateDashboardPriority, type DashboardSection } from "@/domain/routines/priority";
import { averageGapDays, completionsInLastDays, weeklyHistory } from "@/domain/routines/stats";
import { calculateRoutineStatus } from "@/domain/routines/status";
import type { Clock } from "@/domain/routines/types";
import { prisma } from "@/lib/db/prisma";
import { addLocalDays, isSameLocalDay, startOfLocalDay } from "@/lib/dates/zoned";
import { formatDate, formatTime } from "@/lib/i18n/format";
import { toEvents, toSnapshot } from "./mapper";
import { routineIcon, toRoutineView, type RoutineView } from "./view";

/** Enough history for every status calculation (max. 14 sessions per week). */
const STATUS_EVENT_LIMIT = 60;
const DETAIL_HISTORY_LIMIT = 100;
const STATS_WEEKS = 4;
const STATS_DAYS = 30;

async function loadActiveRoutines(userId: string) {
  return prisma.routine.findMany({
    where: { userId, isActive: true },
    include: {
      category: true,
      completions: {
        orderBy: { completedAt: "desc" },
        take: STATUS_EVENT_LIMIT,
        select: { completedAt: true, kind: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export type DashboardData = Record<DashboardSection, RoutineView[]> & {
  openShoppingItems: number;
  doneToday: number;
  isEmpty: boolean;
};

export async function getDashboardData(userId: string, clock: Clock): Promise<DashboardData> {
  const [rows, openShoppingItems, doneToday] = await Promise.all([
    loadActiveRoutines(userId),
    prisma.shoppingItem.count({ where: { userId, archivedAt: null, isChecked: false } }),
    prisma.routineCompletion.count({
      where: {
        userId,
        kind: "DONE",
        completedAt: { gte: startOfLocalDay(clock.now, clock.timeZone), lte: clock.now },
      },
    }),
  ]);
  const inputs = rows.flatMap((row) => {
    const routine = toSnapshot(row);
    return routine ? [{ routine, events: toEvents(row.completions), data: { row, routine } }] : [];
  });
  const dashboard = buildDashboard(inputs, clock);
  const toViews = (section: DashboardSection) =>
    dashboard[section].map(({ data, state }) => toRoutineView(data.row, data.routine, state, clock));
  return {
    overdue: toViews("overdue"),
    today: toViews("today"),
    week: toViews("week"),
    upcoming: toViews("upcoming"),
    openShoppingItems,
    doneToday,
    isEmpty: rows.length === 0,
  };
}

export interface RoutineListItem extends RoutineView {
  /** Dashboard rank; null when not relevant right now. */
  rank: number | null;
}

export async function listRoutines(userId: string, clock: Clock): Promise<RoutineListItem[]> {
  const rows = await loadActiveRoutines(userId);
  return rows.flatMap((row) => {
    const snapshot = toSnapshot(row);
    if (!snapshot) return [];
    const state = calculateRoutineStatus(snapshot, toEvents(row.completions), clock);
    const placement = calculateDashboardPriority(state.status, snapshot.priority);
    return [{ ...toRoutineView(row, snapshot, state, clock), rank: placement?.rank ?? null }];
  });
}

export interface HistoryEntryView {
  id: string;
  kind: "DONE" | "SKIPPED";
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number | null;
  note: string | null;
}

export interface RoutineDetail {
  view: RoutineView;
  estimatedMinutes: number | null;
  reminderOffset: string;
  nextDueLabel: string | null;
  lastDoneLabel: string | null;
  history: HistoryEntryView[];
  stats:
    | { kind: "weekly"; weeks: { label: string; completed: number; target: number }[] }
    | { kind: "interval"; averageGapDays: number | null; last30Days: number };
}

export async function getRoutineDetail(userId: string, routineId: string, clock: Clock): Promise<RoutineDetail | null> {
  const row = await prisma.routine.findFirst({
    where: { id: routineId, userId, isActive: true },
    include: {
      category: true,
      completions: { orderBy: { completedAt: "desc" }, take: DETAIL_HISTORY_LIMIT },
    },
  });
  if (!row) return null;
  const snapshot = toSnapshot(row);
  if (!snapshot) return null;
  const events = toEvents(row.completions);
  const state = calculateRoutineStatus(snapshot, events, clock);
  const zone = clock.timeZone;
  const schedule = snapshot.schedule;
  return {
    view: toRoutineView(row, snapshot, state, clock),
    estimatedMinutes: row.estimatedMinutes,
    reminderOffset: snapshot.reminder.offset,
    nextDueLabel: state.nextDueAt ? formatDate(state.nextDueAt, zone, "long") : null,
    lastDoneLabel: state.lastDoneAt ? formatDate(state.lastDoneAt, zone, "long") : null,
    history: row.completions.map((c) => ({
      id: c.id,
      kind: c.kind,
      dateLabel: formatDate(c.completedAt, zone),
      timeLabel: formatTime(c.completedAt, zone),
      durationMinutes: c.durationMinutes,
      note: c.note,
    })),
    stats:
      schedule.type === "WEEKLY_GOAL"
        ? {
            kind: "weekly",
            weeks: weeklyHistory(schedule, events, clock, STATS_WEEKS).map((week, index) => ({
              label: index === 0 ? "Diese Woche" : `ab ${formatDate(week.weekStart, zone, "long")}`,
              completed: week.completed,
              target: week.target,
            })),
          }
        : {
            kind: "interval",
            averageGapDays: averageGapDays(events, clock),
            last30Days: completionsInLastDays(events, STATS_DAYS, clock),
          },
  };
}

export interface HistoryItem {
  id: string;
  type: "completion" | "skipped" | "shopping";
  title: string;
  icon: string;
  categoryName: string | null;
  timeLabel: string;
  detail: string | null;
  routineId: string | null;
}

export interface HistoryDay {
  key: string;
  label: string;
  items: HistoryItem[];
}

export const HISTORY_FILTER_SHOPPING = "einkauf";
export const HISTORY_FILTER_OTHER = "sonstige";

export interface HistoryQuery {
  /** Category id, "einkauf" for shopping, "sonstige" for uncategorised, or undefined for all. */
  filter?: string;
  days?: number;
  limit: number;
}

function dayLabel(date: Date, clock: Clock): string {
  if (isSameLocalDay(date, clock.now, clock.timeZone)) return "Heute";
  if (isSameLocalDay(date, addLocalDays(clock.now, -1, clock.timeZone), clock.timeZone)) return "Gestern";
  return formatDate(date, clock.timeZone, "weekday");
}

export async function getHistory(userId: string, clock: Clock, query: HistoryQuery) {
  const since = query.days ? startOfLocalDay(addLocalDays(clock.now, -(query.days - 1), clock.timeZone), clock.timeZone) : undefined;
  const completedAt = since ? { gte: since } : undefined;
  const wantsShopping = !query.filter || query.filter === HISTORY_FILTER_SHOPPING;
  const wantsRoutines = query.filter !== HISTORY_FILTER_SHOPPING;
  const categoryFilter =
    query.filter === HISTORY_FILTER_OTHER
      ? { categoryId: null }
      : query.filter && query.filter !== HISTORY_FILTER_SHOPPING
        ? { categoryId: query.filter }
        : {};

  const [completions, sessions] = await Promise.all([
    wantsRoutines
      ? prisma.routineCompletion.findMany({
          where: { userId, completedAt, routine: categoryFilter },
          include: { routine: { include: { category: true } } },
          orderBy: { completedAt: "desc" },
          take: query.limit + 1,
        })
      : [],
    wantsShopping
      ? prisma.shoppingSession.findMany({
          where: { userId, completedAt },
          orderBy: { completedAt: "desc" },
          take: query.limit + 1,
        })
      : [],
  ]);

  const items = [
    ...completions.map((c) => ({
      at: c.completedAt,
      item: {
        id: c.id,
        type: c.kind === "SKIPPED" ? "skipped" : "completion",
        title: c.routine.title,
        icon: routineIcon(c.routine, c.routine.category),
        categoryName: c.routine.category?.name ?? null,
        timeLabel: formatTime(c.completedAt, clock.timeZone),
        detail: [c.durationMinutes ? `${c.durationMinutes} Minuten` : null, c.note].filter(Boolean).join(" · ") || null,
        routineId: c.routine.isActive ? c.routineId : null,
      } satisfies HistoryItem,
    })),
    ...sessions.map((s) => ({
      at: s.completedAt,
      item: {
        id: s.id,
        type: "shopping",
        title: "Einkauf abgeschlossen",
        icon: "shopping-cart",
        categoryName: "Einkauf",
        timeLabel: formatTime(s.completedAt, clock.timeZone),
        detail: s.itemCount === 1 ? "1 Artikel" : `${s.itemCount} Artikel`,
        routineId: null,
      } satisfies HistoryItem,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const hasMore = items.length > query.limit;
  const days: HistoryDay[] = [];
  for (const { at, item } of items.slice(0, query.limit)) {
    const key = startOfLocalDay(at, clock.timeZone).toISOString();
    let day = days.at(-1);
    if (!day || day.key !== key) {
      day = { key, label: dayLabel(at, clock), items: [] };
      days.push(day);
    }
    day.items.push(item);
  }
  return { days, hasMore };
}

export async function getCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { routines: { where: { isActive: true } } } } },
  });
}

export async function getRoutineForEdit(userId: string, routineId: string) {
  const row = await prisma.routine.findFirst({ where: { id: routineId, userId, isActive: true } });
  if (!row) return null;
  const snapshot = toSnapshot(row);
  if (!snapshot) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    icon: row.icon,
    priority: row.priority,
    schedule: snapshot.schedule,
    reminder: snapshot.reminder,
    estimatedMinutes: row.estimatedMinutes,
  };
}
