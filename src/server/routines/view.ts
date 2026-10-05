import type { Category, Routine } from "@prisma/client";
import { isIconKey, type IconKey } from "@/domain/icons";
import type { Priority, RoutineType, Schedule } from "@/domain/routines/schedule";
import type { Clock, RoutineSnapshot, RoutineState } from "@/domain/routines/types";
import { de } from "@/lib/i18n/de";
import { formatDate, formatLastDone, formatRelativeDue, formatSchedule, formatStatus, type StatusTone } from "@/lib/i18n/format";
import { calendarDaysBetween } from "@/lib/dates/zoned";

/** Serializable, pre-formatted routine data for client components. */
export interface RoutineView {
  id: string;
  title: string;
  description: string | null;
  icon: IconKey;
  categoryId: string | null;
  categoryName: string | null;
  type: RoutineType;
  priority: Priority;
  isPaused: boolean;
  scheduleLabel: string;
  statusLabel: string;
  relativeLabel: string;
  tone: StatusTone;
  lastDoneLabel: string;
  snoozedLabel: string | null;
  weekly: { completed: number; target: number } | null;
  /** Epoch ms, for client-side sorting only. */
  nextDueAt: number | null;
  lastDoneAt: number | null;
}

const FALLBACK_ICON: IconKey = "calendar";

export function routineIcon(row: Pick<Routine, "icon">, category: Pick<Category, "icon"> | null): IconKey {
  if (row.icon && isIconKey(row.icon)) return row.icon;
  if (category && isIconKey(category.icon)) return category.icon;
  return FALLBACK_ICON;
}

function snoozedLabel(snapshot: RoutineSnapshot, clock: Clock): string | null {
  const until = snapshot.snoozedUntil;
  if (!until || calendarDaysBetween(clock.now, until, clock.timeZone) <= 0) return null;
  return de.status.snoozedUntil(formatDate(until, clock.timeZone, "long"));
}

export function toRoutineView(
  row: Routine & { category: Category | null },
  snapshot: RoutineSnapshot,
  state: RoutineState,
  clock: Clock,
): RoutineView {
  const status = formatStatus(state.status, clock);
  const schedule: Schedule = snapshot.schedule;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: routineIcon(row, row.category),
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    type: schedule.type,
    priority: row.priority,
    isPaused: row.isPaused,
    scheduleLabel: formatSchedule(schedule, clock.timeZone),
    statusLabel: status.label,
    relativeLabel: formatRelativeDue(state.status, clock),
    tone: status.tone,
    lastDoneLabel: formatLastDone(state, clock),
    snoozedLabel: snoozedLabel(snapshot, clock),
    weekly:
      state.status.kind === "weekly"
        ? { completed: state.status.progress.completed, target: state.status.progress.target }
        : null,
    nextDueAt: state.nextDueAt?.getTime() ?? null,
    lastDoneAt: state.lastDoneAt?.getTime() ?? null,
  };
}
