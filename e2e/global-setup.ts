import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "vite";

/**
 * Prepares the separate test database (TEST_DATABASE_URL): applies migrations,
 * empties all tables and creates the E2E user with onboarding done.
 */
export default async function globalSetup() {
  const url = loadEnv("test", process.cwd(), "").TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set. Add it to .env (see .env.example).");

  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await db.$executeRawUnsafe(
      'TRUNCATE "RoutineCompletion", "Routine", "Category", "ShoppingItem", "ShoppingSession", "AppSettings", "User" CASCADE',
    );
    await db.user.create({
      data: {
        email: "e2e@routine.local",
        settings: { create: { onboardingCompletedAt: new Date() } },
      },
    });
  } finally {
    await db.$disconnect();
  }
}
