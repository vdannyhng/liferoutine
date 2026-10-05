import { calculateDashboardPriority, compareRankedItems, type DashboardSection, type RankedItem } from "./priority";
import { calculateRoutineStatus } from "./status";
import type { Clock, CompletionEvent, RoutineSnapshot, RoutineState } from "./types";

export interface DashboardEntry<T> extends RankedItem {
  state: RoutineState;
  data: T;
}

export type Dashboard<T> = Record<DashboardSection, DashboardEntry<T>[]>;

export interface DashboardInput<T> {
  routine: RoutineSnapshot;
  events: readonly CompletionEvent[];
  data: T;
}

/** Groups routines into dashboard sections, each sorted by relevance. */
export function buildDashboard<T>(inputs: readonly DashboardInput<T>[], clock: Clock): Dashboard<T> {
  const dashboard: Dashboard<T> = { overdue: [], today: [], week: [], upcoming: [] };
  for (const { routine, events, data } of inputs) {
    const state = calculateRoutineStatus(routine, events, clock);
    const placement = calculateDashboardPriority(state.status, routine.priority);
    if (!placement) continue;
    dashboard[placement.section].push({
      id: routine.id,
      title: routine.title,
      priority: routine.priority,
      status: state.status,
      placement,
      state,
      data,
    });
  }
  for (const section of Object.values(dashboard)) section.sort(compareRankedItems);
  return dashboard;
}
