"use client";

import { useCallback, useOptimistic, useTransition } from "react";
import { completeRoutine } from "./client-actions";

const NO_PENDING: ReadonlyMap<string, number> = new Map();

/**
 * Optimistic "Erledigt": counts completions in flight per routine until the
 * server responds with fresh data (or the action fails and it rolls back).
 */
export function useOptimisticCompletion() {
  const [, startTransition] = useTransition();
  const [pending, addPending] = useOptimistic(NO_PENDING, (state, routineId: string) => {
    const next = new Map(state);
    next.set(routineId, (next.get(routineId) ?? 0) + 1);
    return next;
  });

  const complete = useCallback(
    (routine: { id: string; title: string }) => {
      startTransition(async () => {
        addPending(routine.id);
        await completeRoutine(routine);
      });
    },
    [addPending],
  );

  return { pending, complete };
}
