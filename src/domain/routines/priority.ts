import type { Priority } from "./schedule";
import type { RoutineStatus } from "./types";

export type DashboardSection = "overdue" | "today" | "week" | "upcoming";

/** Routines due within this many days appear under "Demnächst". */
export const UPCOMING_HORIZON_DAYS = 14;

/**
 * Dashboard ranks (lower = more important), as defined in the spec:
 * 1 overdue HIGH, 2 due today HIGH, 3 overdue, 4 due today,
 * 5 weekly goals that are behind, 6 upcoming, 7 other suggestions.
 */
export const DASHBOARD_RANK = {
  OVERDUE_HIGH: 1,
  DUE_HIGH: 2,
  OVERDUE: 3,
  DUE: 4,
  WEEKLY_BEHIND: 5,
  UPCOMING: 6,
  OTHER: 7,
} as const;

export type DashboardRank = (typeof DASHBOARD_RANK)[keyof typeof DASHBOARD_RANK];

export interface DashboardPlacement {
  rank: DashboardRank;
  section: DashboardSection;
}

const PRIORITY_WEIGHT: Record<Priority, number> = { HIGH: 2, NORMAL: 1, LOW: 0 };

export function priorityWeight(priority: Priority): number {
  return PRIORITY_WEIGHT[priority];
}

/** Where (and whether) a routine shows up on the "Heute" dashboard. */
export function calculateDashboardPriority(
  status: RoutineStatus,
  priority: Priority,
): DashboardPlacement | null {
  const high = priority === "HIGH";
  switch (status.kind) {
    case "overdue":
      return { rank: high ? DASHBOARD_RANK.OVERDUE_HIGH : DASHBOARD_RANK.OVERDUE, section: "overdue" };
    case "due":
      return { rank: high ? DASHBOARD_RANK.DUE_HIGH : DASHBOARD_RANK.DUE, section: "today" };
    case "weekly": {
      const { progress } = status;
      if (progress.urgent) return { rank: DASHBOARD_RANK.WEEKLY_BEHIND, section: "today" };
      if (progress.behind && !status.snoozed) {
        return { rank: DASHBOARD_RANK.WEEKLY_BEHIND, section: "week" };
      }
      return { rank: DASHBOARD_RANK.OTHER, section: "week" };
    }
    case "upcoming":
      return status.daysUntil <= UPCOMING_HORIZON_DAYS
        ? { rank: DASHBOARD_RANK.UPCOMING, section: "upcoming" }
        : null;
    case "paused":
    case "done":
    case "manual":
      return null;
  }
}

/** Secondary ordering within the same rank: most pressing first. */
function urgencyKey(status: RoutineStatus): number {
  switch (status.kind) {
    case "overdue":
      return -status.daysOverdue;
    case "due":
    case "upcoming":
      return status.dueAt.getTime();
    case "weekly":
      return status.progress.daysLeft - status.progress.remaining;
    default:
      return 0;
  }
}

export interface RankedItem {
  id: string;
  title: string;
  priority: Priority;
  status: RoutineStatus;
  placement: DashboardPlacement;
}

/** Deterministic: rank, priority, urgency, title, id. */
export function compareRankedItems(a: RankedItem, b: RankedItem): number {
  return (
    a.placement.rank - b.placement.rank ||
    priorityWeight(b.priority) - priorityWeight(a.priority) ||
    urgencyKey(a.status) - urgencyKey(b.status) ||
    a.title.localeCompare(b.title, "de") ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}
