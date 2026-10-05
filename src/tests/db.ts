import { PrismaClient } from "@prisma/client";
import { ensureUserDefaults } from "@/server/bootstrap";

export const testDb = new PrismaClient();

/** Empties all tables so every test starts from a clean database. */
export async function resetDatabase() {
  await testDb.$executeRawUnsafe(
    'TRUNCATE "RoutineCompletion", "Routine", "Category", "ShoppingItem", "ShoppingSession", "AppSettings", "User" CASCADE',
  );
}

export async function createTestUser(email = "test@routine.local") {
  const user = await testDb.user.create({ data: { email } });
  await ensureUserDefaults(testDb, user.id);
  return user.id;
}
