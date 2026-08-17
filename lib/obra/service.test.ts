import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";

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

describe("crearObra", () => {
  // Imported lazily so this file can be collected even when @prisma/client has not been
  // generated yet (no DATABASE_URL / no DB in this sandbox).
  let prisma: typeof import("../db/prisma").prisma;
  let crearObra: typeof import("./service").crearObra;
  let ObraYaExisteError: typeof import("./service").ObraYaExisteError;
  let SEEDED_CONSTRUCTOR_ID: string;

  beforeEach(async () => {
    if (!hasDatabaseUrl) return;

    ({ prisma } = await import("../db/prisma"));
    ({ crearObra, ObraYaExisteError } = await import("./service"));
    ({ SEEDED_CONSTRUCTOR_ID } = await import("../auth/current-constructor"));

    const { seed } = await import("../../prisma/seed");
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

  it("should create the obra with valid data — AC-01", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const obra = await crearObra(SEEDED_CONSTRUCTOR_ID, datosValidos);

    expect(obra.id).toBeDefined();
    expect(obra.nombre).toBe(datosValidos.nombre);
    expect(obra.constructorId).toBe(SEEDED_CONSTRUCTOR_ID);
  });

  it("should reject a second obra for the same constructor — AC-04", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    await crearObra(SEEDED_CONSTRUCTOR_ID, datosValidos);

    await expect(
      crearObra(SEEDED_CONSTRUCTOR_ID, {
        ...datosValidos,
        nombre: "Torre Sur",
      })
    ).rejects.toBeInstanceOf(ObraYaExisteError);
  });

  it("should create the initial budget together with the obra — AC-05", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const obra = await crearObra(SEEDED_CONSTRUCTOR_ID, {
      ...datosValidos,
      presupuestoInicial: 2500000,
    });

    expect(obra.presupuestoInicial).toBe(2500000);
  });
});
