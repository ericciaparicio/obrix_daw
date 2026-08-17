import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { crearObra } from "../../../../lib/obra/service";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const datosValidos = {
  nombre: "Torre Norte",
  pais: "Argentina",
  provincia: "Buenos Aires",
  localidad: "La Plata",
  direccion: "Calle 7 123",
  latitud: -34.9214,
  longitud: -57.9544,
  fechaInicio: "2026-01-01",
  fechaFin: "2026-12-31",
  presupuestoInicial: 1000000,
};

describe("GET /api/obras/actual", () => {
  // Imported lazily so this file can be collected even when @prisma/client has not been
  // generated yet (no DATABASE_URL / no DB in this sandbox) — same pattern as
  // app/api/obras/route.test.ts.
  let prisma: typeof import("../../../../lib/db/prisma").prisma;
  let GET: typeof import("./route").GET;
  let SEEDED_CONSTRUCTOR_ID: string;

  beforeEach(async () => {
    if (!hasDatabaseUrl) return;

    ({ prisma } = await import("../../../../lib/db/prisma"));
    ({ GET } = await import("./route"));
    ({ SEEDED_CONSTRUCTOR_ID } = await import(
      "../../../../lib/auth/current-constructor"
    ));

    const { seed } = await import("../../../../prisma/seed");
    await seed();

    // Rule #0: only ever operate on data this test created. Ensure a clean slate.
    await prisma.obra.deleteMany({ where: { constructorId: SEEDED_CONSTRUCTOR_ID } });
  });

  afterEach(async () => {
    if (!hasDatabaseUrl) return;
    await prisma.obra.deleteMany({ where: { constructorId: SEEDED_CONSTRUCTOR_ID } });
  });

  afterAll(async () => {
    if (!hasDatabaseUrl) return;
    await prisma.$disconnect();
  });

  it("should return 404 with sin_obra when the constructor has no obra", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("sin_obra");
  });

  it("should return 200 with the constructor's obra when one exists", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    await crearObra(SEEDED_CONSTRUCTOR_ID, datosValidos);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nombre).toBe(datosValidos.nombre);
    expect(body.id).toBeDefined();
  });
});
