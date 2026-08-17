import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("prisma db push", () => {
  it("should apply the schema without error against a Postgres database", () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    expect(() =>
      execSync("pnpm exec prisma db push --skip-generate --accept-data-loss", {
        stdio: "pipe",
      })
    ).not.toThrow();
  });
});

describe("seed", () => {
  // Imported lazily inside the test body so that this file can be collected even when
  // @prisma/client has not been generated yet (no DATABASE_URL / no DB in this environment).
  afterAll(async () => {
    if (!hasDatabaseUrl) return;
    const { prisma } = await import("../lib/db/prisma");
    const { SEEDED_CONSTRUCTOR_EMAIL } = await import(
      "../lib/auth/current-constructor"
    );
    // Rule #0: only clean up the data this test created.
    await prisma.constructor
      .deleteMany({ where: { email: SEEDED_CONSTRUCTOR_EMAIL } })
      .catch(() => undefined);
    await prisma.$disconnect();
  });

  it("should be idempotent — running it twice does not duplicate the constructor", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const { prisma } = await import("../lib/db/prisma");
    const { seed } = await import("./seed");
    const { SEEDED_CONSTRUCTOR_EMAIL } = await import(
      "../lib/auth/current-constructor"
    );

    await seed();
    await seed();

    const count = await prisma.constructor.count({
      where: { email: SEEDED_CONSTRUCTOR_EMAIL },
    });

    expect(count).toBe(1);
  });
});
