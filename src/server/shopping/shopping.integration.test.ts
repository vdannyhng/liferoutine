import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestUser, resetDatabase, testDb } from "@/tests/db";
import { clockAt } from "@/tests/time";
import { DomainError } from "@/server/errors";
import * as service from "./service";

let userId: string;

beforeEach(async () => {
  await resetDatabase();
  userId = await createTestUser();
});

afterAll(async () => {
  await testDb.$disconnect();
});

describe("shopping (integration)", () => {
  it("adds an item with only a name", async () => {
    const item = await service.addShoppingItem(testDb, userId, { name: "  Milch " });
    expect(item).toMatchObject({ name: "Milch", quantity: null, isChecked: false });
    await expect(service.addShoppingItem(testDb, userId, { name: "" })).rejects.toThrow();
  });

  it("checks and unchecks an item", async () => {
    const item = await service.addShoppingItem(testDb, userId, { name: "Milch", quantity: 2, unit: "Liter" });
    const clock = clockAt(new Date());
    const checked = await service.toggleShoppingItem(testDb, userId, clock, { id: item.id, checked: true });
    expect(checked).toMatchObject({ isChecked: true, checkedAt: clock.now });
    const unchecked = await service.toggleShoppingItem(testDb, userId, clock, { id: item.id, checked: false });
    expect(unchecked).toMatchObject({ isChecked: false, checkedAt: null });
  });

  it("completes shopping: archives checked items and keeps open ones", async () => {
    const milk = await service.addShoppingItem(testDb, userId, { name: "Milch" });
    const bread = await service.addShoppingItem(testDb, userId, { name: "Brot" });
    const clock = clockAt(new Date());
    await service.toggleShoppingItem(testDb, userId, clock, { id: milk.id, checked: true });

    const session = await service.completeShopping(testDb, userId, clock);
    expect(session.itemCount).toBe(1);
    expect(await testDb.shoppingItem.findUnique({ where: { id: milk.id } })).toMatchObject({
      archivedAt: clock.now,
      sessionId: session.id,
    });
    expect(await testDb.shoppingItem.findUnique({ where: { id: bread.id } })).toMatchObject({ archivedAt: null });
  });

  it("refuses to complete shopping without checked items", async () => {
    await service.addShoppingItem(testDb, userId, { name: "Brot" });
    await expect(service.completeShopping(testDb, userId, clockAt(new Date()))).rejects.toBeInstanceOf(DomainError);
  });

  it("keeps other users' items untouchable", async () => {
    const item = await service.addShoppingItem(testDb, userId, { name: "Milch" });
    const other = await createTestUser("other@routine.local");
    await expect(
      service.toggleShoppingItem(testDb, other, clockAt(new Date()), { id: item.id, checked: true }),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(service.deleteShoppingItem(testDb, other, { id: item.id })).rejects.toBeInstanceOf(DomainError);
  });
});
