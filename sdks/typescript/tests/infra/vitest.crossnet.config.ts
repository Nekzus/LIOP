import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/crossnet/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
