import { execSync } from "node:child_process";
import { loadEnv } from "vite";

/** Applies all migrations to the test database before the integration run. */
export default function setup() {
  const url = loadEnv("test", process.cwd(), "").TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Add it to .env (see .env.example).");
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
