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

  // NOTE: `prisma.$disconnect()` intentionally lives ONLY in the last `describe` block of this
  // file (`actualizarPresupuesto`), not here. This file now has three `describe` blocks sharing
  // the same PrismaClient singleton (`lib/db/prisma.ts`) within one test-file process; an
  // `afterAll` per block would disconnect it after the first block's tests finish, breaking the
  // later blocks that still need it.

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

describe("actualizarObra", () => {
  // Imported lazily so this file can be collected even when @prisma/client has not been
  // generated yet (no DATABASE_URL / no DB in this sandbox).
  let prisma: typeof import("../db/prisma").prisma;
  let crearObra: typeof import("./service").crearObra;
  let actualizarObra: typeof import("./service").actualizarObra;
  let ObraNoEncontradaError: typeof import("./service").ObraNoEncontradaError;
  let SEEDED_CONSTRUCTOR_ID: string;
  let obraId: string;

  beforeEach(async () => {
    if (!hasDatabaseUrl) return;

    ({ prisma } = await import("../db/prisma"));
    ({ crearObra, actualizarObra, ObraNoEncontradaError } = await import("./service"));
    ({ SEEDED_CONSTRUCTOR_ID } = await import("../auth/current-constructor"));

    const { seed } = await import("../../prisma/seed");
    await seed();

    // Rule #0: only ever operate on data this test created. Ensure a clean slate.
    await prisma.obra.deleteMany({ where: { constructorId: SEEDED_CONSTRUCTOR_ID } });
    const obra = await crearObra(SEEDED_CONSTRUCTOR_ID, datosValidos);
    obraId = obra.id;
  });

  afterEach(async () => {
    if (!hasDatabaseUrl) return;
    await prisma.obra.deleteMany({ where: { constructorId: SEEDED_CONSTRUCTOR_ID } });
  });

  it("should edit an obra field with a valid value and persist it — AC-07", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const obra = await actualizarObra(obraId, { ...datosValidos, nombre: "Torre Actualizada" });

    expect(obra.nombre).toBe("Torre Actualizada");
  });

  it("should reject leaving a required field empty when editing — AC-08", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    await expect(
      actualizarObra(obraId, { ...datosValidos, nombre: "" })
    ).rejects.toThrow();
  });

  it("should reject the edit if fechaFin ends up before fechaInicio — AC-09", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    await expect(
      actualizarObra(obraId, {
        ...datosValidos,
        fechaInicio: "2026-06-01",
        fechaFin: "2026-01-01",
      })
    ).rejects.toThrow();
  });

  it("should throw ObraNoEncontradaError when the id does not exist", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    await expect(
      actualizarObra("id-inexistente", datosValidos)
    ).rejects.toBeInstanceOf(ObraNoEncontradaError);
  });
});

describe("actualizarPresupuesto", () => {
  // Imported lazily so this file can be collected even when @prisma/client has not been
  // generated yet (no DATABASE_URL / no DB in this sandbox).
  let prisma: typeof import("../db/prisma").prisma;
  let crearObra: typeof import("./service").crearObra;
  let actualizarPresupuesto: typeof import("./service").actualizarPresupuesto;
  let ObraNoEncontradaError: typeof import("./service").ObraNoEncontradaError;
  let SEEDED_CONSTRUCTOR_ID: string;
  let obraId: string;

  beforeEach(async () => {
    if (!hasDatabaseUrl) return;

    ({ prisma } = await import("../db/prisma"));
    ({ crearObra, actualizarPresupuesto, ObraNoEncontradaError } = await import("./service"));
    ({ SEEDED_CONSTRUCTOR_ID } = await import("../auth/current-constructor"));

    const { seed } = await import("../../prisma/seed");
    await seed();

    // Rule #0: only ever operate on data this test created. Ensure a clean slate.
    await prisma.obra.deleteMany({ where: { constructorId: SEEDED_CONSTRUCTOR_ID } });
    const obra = await crearObra(SEEDED_CONSTRUCTOR_ID, datosValidos);
    obraId = obra.id;
  });

  afterEach(async () => {
    if (!hasDatabaseUrl) return;
    await prisma.obra.deleteMany({ where: { constructorId: SEEDED_CONSTRUCTOR_ID } });
  });

  afterAll(async () => {
    if (!hasDatabaseUrl) return;
    await prisma.$disconnect();
  });

  it("should edit the budget with a valid positive integer amount and persist it — AC-10", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const obra = await actualizarPresupuesto(obraId, { presupuestoInicial: 3000000 });

    expect(obra.presupuestoInicial).toBe(3000000);
  });

  it("should reject an invalid budget amount (zero, negative, non-numeric or non-integer) — AC-11", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    await expect(actualizarPresupuesto(obraId, { presupuestoInicial: 0 })).rejects.toThrow();
    await expect(actualizarPresupuesto(obraId, { presupuestoInicial: -100 })).rejects.toThrow();
    await expect(actualizarPresupuesto(obraId, { presupuestoInicial: 100.5 })).rejects.toThrow();
    await expect(
      actualizarPresupuesto(obraId, { presupuestoInicial: "abc" })
    ).rejects.toThrow();
  });

  it("should throw ObraNoEncontradaError when the id does not exist", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    await expect(
      actualizarPresupuesto("id-inexistente", { presupuestoInicial: 1000 })
    ).rejects.toBeInstanceOf(ObraNoEncontradaError);
  });
});
