import type { Prisma } from "@prisma/client";
import type { Clock } from "@/domain/routines/types";
import type { Db } from "@/lib/db/prisma";
import { atLocalTime, calendarDaysBetween, isSameLocalDay, localDateToInstant } from "@/lib/dates/zoned";
import {
  completeRoutineSchema,
  completionIdSchema,
  deleteRoutineSchema,
  resumeRoutineSchema,
  routineIdSchema,
  routineInputSchema,
  snoozeRoutineSchema,
  updateRoutineSchema,
  type ValidRoutineInput,
} from "@/lib/validation/routine";
import { DomainError } from "@/server/errors";

/** Backdated completions are stored at local noon of the chosen day. */
const BACKDATED_TIME = "12:00";
/** How long an undo is accepted after completing. */
export const UNDO_WINDOW_MS = 10 * 60 * 1000;

async function findOwnRoutine(db: Db, userId: string, routineId: string) {
  const routine = await db.routine.findFirst({ where: { id: routineId, userId, isActive: true } });
  if (!routine) throw new DomainError("Routine wurde nicht gefunden.", "NOT_FOUND");
  return routine;
}

async function assertOwnCategory(db: Db, userId: string, categoryId: string | null) {
  if (!categoryId) return;
  const category = await db.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
  if (!category) throw new DomainError("Kategorie wurde nicht gefunden.", "NOT_FOUND");
}

function routineData(input: ValidRoutineInput) {
  return {
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    icon: input.icon,
    priority: input.priority,
    type: input.schedule.type,
    scheduleConfig: input.schedule as Prisma.InputJsonObject,
    reminderConfig: input.reminder as Prisma.InputJsonObject,
    estimatedMinutes: input.estimatedMinutes,
  };
}

export async function createRoutine(db: Db, userId: string, raw: unknown) {
  const input = routineInputSchema.parse(raw);
  await assertOwnCategory(db, userId, input.categoryId);
  return db.routine.create({ data: { userId, ...routineData(input) } });
}

export async function updateRoutine(db: Db, userId: string, raw: unknown) {
  const { id, ...input } = updateRoutineSchema.parse(raw);
  const existing = await findOwnRoutine(db, userId, id);
  await assertOwnCategory(db, userId, input.categoryId);
  // Past completions are never modified; a new rhythm type drops a pending snooze.
  const typeChanged = existing.type !== input.schedule.type;
  return db.routine.update({
    where: { id },
    data: { ...routineData(input), ...(typeChanged ? { snoozedUntil: null } : {}) },
  });
}

export async function deleteRoutine(db: Db, userId: string, raw: unknown) {
  const { routineId, deleteHistory } = deleteRoutineSchema.parse(raw);
  const routine = await findOwnRoutine(db, userId, routineId);
  if (deleteHistory) {
    await db.routine.delete({ where: { id: routine.id } });
  } else {
    await db.routine.update({ where: { id: routine.id }, data: { isActive: false } });
  }
  return routine;
}

function completionInstant(date: string | undefined, clock: Clock): Date {
  if (!date) return clock.now;
  const day = localDateToInstant(date, clock.timeZone);
  if (calendarDaysBetween(clock.now, day, clock.timeZone) > 0) {
    throw new DomainError("Ein Abschluss kann nicht in der Zukunft liegen.");
  }
  return isSameLocalDay(day, clock.now, clock.timeZone)
    ? clock.now
    : atLocalTime(day, BACKDATED_TIME, clock.timeZone);
}

export async function completeRoutine(db: Db, userId: string, clock: Clock, raw: unknown) {
  const input = completeRoutineSchema.parse(raw);
  const routine = await findOwnRoutine(db, userId, input.routineId);
  const completedAt = completionInstant(input.date, clock);
  const [completion] = await db.$transaction([
    db.routineCompletion.create({
      data: {
        routineId: routine.id,
        userId,
        kind: "DONE",
        completedAt,
        durationMinutes: input.durationMinutes,
        note: input.note,
      },
    }),
    db.routine.update({ where: { id: routine.id }, data: { snoozedUntil: null } }),
  ]);
  return { completion, routine };
}

export async function skipRoutine(db: Db, userId: string, clock: Clock, raw: unknown) {
  const { routineId } = routineIdSchema.parse(raw);
  const routine = await findOwnRoutine(db, userId, routineId);
  const completion = await db.routineCompletion.create({
    data: { routineId: routine.id, userId, kind: "SKIPPED", completedAt: clock.now },
  });
  return { completion, routine };
}

/** Removes a completion created moments ago (toast "Rückgängig"). */
export async function undoCompletion(db: Db, userId: string, clock: Clock, raw: unknown) {
  const { completionId } = completionIdSchema.parse(raw);
  const completion = await db.routineCompletion.findFirst({ where: { id: completionId, userId } });
  if (!completion) throw new DomainError("Eintrag wurde nicht gefunden.", "NOT_FOUND");
  if (clock.now.getTime() - completion.createdAt.getTime() > UNDO_WINDOW_MS) {
    throw new DomainError("Das kann nicht mehr rückgängig gemacht werden.", "CONFLICT");
  }
  await db.routineCompletion.delete({ where: { id: completion.id } });
  return completion;
}

/** Deletes a single history entry, e.g. one entered by mistake. */
export async function deleteCompletion(db: Db, userId: string, raw: unknown) {
  const { completionId } = completionIdSchema.parse(raw);
  const result = await db.routineCompletion.deleteMany({ where: { id: completionId, userId } });
  if (result.count === 0) throw new DomainError("Eintrag wurde nicht gefunden.", "NOT_FOUND");
}

export async function snoozeRoutine(db: Db, userId: string, clock: Clock, raw: unknown) {
  const { routineId, until } = snoozeRoutineSchema.parse(raw);
  const routine = await findOwnRoutine(db, userId, routineId);
  const day = localDateToInstant(until, clock.timeZone);
  if (calendarDaysBetween(clock.now, day, clock.timeZone) <= 0) {
    throw new DomainError("Bitte wähle einen Tag in der Zukunft.");
  }
  return db.routine.update({ where: { id: routine.id }, data: { snoozedUntil: day } });
}

export async function pauseRoutine(db: Db, userId: string, clock: Clock, raw: unknown) {
  const { routineId } = routineIdSchema.parse(raw);
  const routine = await findOwnRoutine(db, userId, routineId);
  return db.routine.update({ where: { id: routine.id }, data: { isPaused: true, pausedAt: clock.now } });
}

export async function resumeRoutine(db: Db, userId: string, clock: Clock, raw: unknown) {
  const { routineId, mode } = resumeRoutineSchema.parse(raw);
  const routine = await findOwnRoutine(db, userId, routineId);
  return db.routine.update({
    where: { id: routine.id },
    data: {
      isPaused: false,
      pausedAt: null,
      snoozedUntil: null,
      ...(mode === "restart" ? { rhythmAnchorAt: clock.now } : {}),
    },
  });
}
