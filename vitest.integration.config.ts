import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    test: {
      globals: true,
      environment: "node",
      include: ["src/**/*.integration.test.ts"],
      globalSetup: ["./src/tests/integration-global-setup.ts"],
      fileParallelism: false,
      // Integration tests always run against the separate test database.
      env: { TZ: "Europe/Berlin", DATABASE_URL: env.TEST_DATABASE_URL ?? "" },
    },
  };
});
