import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      JWT_SECRET: "test-secret",
      ALLOWED_ORIGINS: "http://localhost:5173",
    },
  },
});
