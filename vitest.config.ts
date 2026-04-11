import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/backend/infrastructure/adapters/repositories/gardening/indexed-db/**",
      "tests/backend/infrastructure/adapters/repositories/spatial/indexed-db/**",
    ],
    setupFiles: ["./tests/vitest-setup.ts"],
  },
});
