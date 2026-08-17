import { defineConfig } from "vitest/config";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// Vitest does not populate process.env from .env the way `next`/`prisma` CLIs do —
// without this, DATABASE_URL-gated tests always fall back to SKIP.
function loadDotEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    let value = (match[2] ?? "").trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[key] = value;
  }
}
loadDotEnv(path.resolve(__dirname, ".env"));

export default defineConfig({
  // tsconfig.json sets "jsx": "preserve" (Next.js transforms JSX itself, via SWC). Vitest's own
  // esbuild-based transform needs to be told explicitly how to handle JSX in component tests
  // (Block 3) — "automatic" matches React 19's runtime (no `import React` needed per file).
  // Files with no JSX (all the pre-existing Node-environment tests) are unaffected.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    // DB-integration tests across files share the same seeded Constructor row and the
    // same `constructorId @unique` constraint on Obra — running test files in parallel
    // races them against each other on that shared row. Serialize file execution instead
    // of giving every DB-touching test its own isolated fixture, since this suite is small.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
