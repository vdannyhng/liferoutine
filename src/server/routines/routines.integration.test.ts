import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { calculateRoutineStatus } from "@/domain/routines/status";
import { createTestUser, resetDatabase, testDb } from "@/tests/db";
import { clockAt, local } from "@/tests/time";
import { DomainError } from "@/server/errors";
import { toEvents, toSnapshot } from "./mapper";
import * as service from "./service";

const vacuum = {
  title: "Staubsaugen",
  schedule: { type: "INTERVAL", value: 7, unit: "DAY" },
};

async function statusOf(routineId: string, now: Date) {
  const row = await testDb.routine.findUniqueOrThrow({ where: { id: routineId }, include: { completions: true } });
  return calculateRoutineStatus(toSnapshot(row)!, toEvents(row.completions), clockAt(now)).status;
}

let userId: string;

beforeEach(async () => {
  await resetDatabase();
  userId = await createTestUser();
});

afterAll(async () => {
  await testDb.$disconnect();
});

describe("routines (integration)", () => {
  it("creates a routine with a validated schedule", async () => {
    const category = await testDb.category.findFirstOrThrow({ where: { userId, name: "Haushalt" } });
    const routine = await service.createRoutine(testDb, userId, { ...vacuum, categoryId: category.id });
    expect(routine).toMatchObject({ title: "Staubsaugen", type: "INTERVAL", priority: "NORMAL", categoryId: category.id });
    expect(routine.scheduleConfig).toEqual({ type: "INTERVAL", value: 7, unit: "DAY" });
  });

  it("rejects invalid input on the server", async () => {
    await expect(service.createRoutine(testDb, userId, { title: "  ", schedule: vacuum.schedule })).rejects.toThrow();
    await expect(
      service.createRoutine(testDb, userId, { title: "X", schedule: { type: "INTERVAL", value: 0, unit: "DAY" } }),
    ).rejects.toThrow();
  });

  it("does not allow categories of other users", async () => {
    const otherUser = await createTestUser("other@routine.local");
    const foreign = await testDb.category.findFirstOrThrow({ where: { userId: otherUser } });
    await expect(service.createRoutine(testDb, userId, { ...vacuum, categoryId: foreign.id })).rejects.toBeInstanceOf(
      DomainError,
    );
  });

  it("edits a routine without touching its history", async () => {
    const routine = await service.createRoutine(testDb, userId, vacuum);
    const clock = clockAt(local(2026, 10, 5, 9));
    await service.completeRoutine(testDb, userId, clock, { routineId: routine.id });
    const updated = await service.updateRoutine(testDb, userId, {
      id: routine.id,
      title: "Saugen",
      schedule: { type: "WEEKLY_GOAL", targetCount: 2 },
      priority: "HIGH",
    });
    expect(updated).toMatchObject({ title: "Saugen", type: "WEEKLY_GOAL", priority: "HIGH" });
    const completions = await testDb.routineCompletion.findMany({ where: { routineId: routine.id } });
    expect(completions).toHaveLength(1);
    expect(completions[0]!.completedAt).toEqual(clock.now);
  });

  it("completes a routine and moves the next due date", async () => {
    const routine = await service.createRoutine(testDb, userId, vacuum);
    const now = local(2026, 10, 5, 9);
    expect(await statusOf(routine.id, now)).toMatchObject({ kind: "due" });
    await service.completeRoutine(testDb, userId, clockAt(now), { routineId: routine.id });
    expect(await statusOf(routine.id, now)).toMatchObject({ kind: "upcoming", daysUntil: 7 });
  });

  it("records backdated completions at local noon and refuses future dates", async () => {
    const routine = await service.createRoutine(testDb, userId, vacuum);
    const clock = clockAt(local(2026, 10, 5, 9));
    const { completion } = await service.completeRoutine(testDb, userId, clock, {
      routineId: routine.id,
      date: "2026-10-03",
      durationMinutes: 55,
      note: "Beine",
    });
    expect(completion.completedAt).toEqual(local(2026, 10, 3, 12));
    expect(completion).toMatchObject({ durationMinutes: 55, note: "Beine" });
    await expect(
      service.completeRoutine(testDb, userId, clock, { routineId: routine.id, date: "2026-10-06" }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("undoes a completion", async () => {
    const routine = await service.createRoutine(testDb, userId, vacuum);
    const clock = clockAt(new Date());
    const { completion } = await service.completeRoutine(testDb, userId, clock, { routineId: routine.id });
    await service.undoCompletion(testDb, userId, clock, { completionId: completion.id });
    expect(await testDb.routineCompletion.count({ where: { routineId: routine.id } })).toBe(0);
  });

  it("only lets users change their own data", async () => {
    const routine = await service.createRoutine(testDb, userId, vacuum);
    const intruder = await createTestUser("intruder@routine.local");
    const clock = clockAt(new Date());
    await expect(service.completeRoutine(testDb, intruder, clock, { routineId: routine.id })).rejects.toBeInstanceOf(
      DomainError,
    );
    const { completion } = await service.completeRoutine(testDb, userId, clock, { routineId: routine.id });
    await expect(service.undoCompletion(testDb, intruder, clock, { completionId: completion.id })).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(service.deleteRoutine(testDb, intruder, { routineId: routine.id })).rejects.toBeInstanceOf(DomainError);
  });

  it("pauses and resumes a routine (continue or restart)", async () => {
    const routine = await service.createRoutine(testDb, userId, vacuum);
    await service.completeRoutine(testDb, userId, clockAt(local(2026, 9, 1, 9)), { routineId: routine.id });
    await service.pauseRoutine(testDb, userId, clockAt(local(2026, 9, 2)), { routineId: routine.id });
    expect(await statusOf(routine.id, local(2026, 10, 5))).toEqual({ kind: "paused" });

    await service.resumeRoutine(testDb, userId, clockAt(local(2026, 10, 5, 9)), { routineId: routine.id, mode: "continue" });
    expect(await statusOf(routine.id, local(2026, 10, 5, 10))).toMatchObject({ kind: "overdue" });

    await service.pauseRoutine(testDb, userId, clockAt(local(2026, 10, 5, 11)), { routineId: routine.id });
    await service.resumeRoutine(testDb, userId, clockAt(local(2026, 10, 5, 12)), { routineId: routine.id, mode: "restart" });
    expect(await statusOf(routine.id, local(2026, 10, 5, 13))).toMatchObject({ kind: "upcoming", daysUntil: 7 });
  });

  it("skips and snoozes", async () => {
    const routine = await service.createRoutine(testDb, userId, vacuum);
    const now = local(2026, 10, 5, 9);
    await service.snoozeRoutine(testDb, userId, clockAt(now), { routineId: routine.id, until: "2026-10-07" });
    expect(await statusOf(routine.id, now)).toMatchObject({ kind: "upcoming", daysUntil: 2 });
    await service.skipRoutine(testDb, userId, clockAt(now), { routineId: routine.id });
    const skip = await testDb.routineCompletion.findFirstOrThrow({ where: { routineId: routine.id } });
    expect(skip.kind).toBe("SKIPPED");
  });

  it("deletes softly by default and fully on request", async () => {
    const soft = await service.createRoutine(testDb, userId, vacuum);
    await service.completeRoutine(testDb, userId, clockAt(new Date()), { routineId: soft.id });
    await service.deleteRoutine(testDb, userId, { routineId: soft.id });
    expect(await testDb.routine.findUnique({ where: { id: soft.id } })).toMatchObject({ isActive: false });
    expect(await testDb.routineCompletion.count({ where: { routineId: soft.id } })).toBe(1);

    const hard = await service.createRoutine(testDb, userId, vacuum);
    await service.completeRoutine(testDb, userId, clockAt(new Date()), { routineId: hard.id });
    await service.deleteRoutine(testDb, userId, { routineId: hard.id, deleteHistory: true });
    expect(await testDb.routine.findUnique({ where: { id: hard.id } })).toBeNull();
    expect(await testDb.routineCompletion.count({ where: { routineId: hard.id } })).toBe(0);
  });
});
