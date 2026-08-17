import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

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

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/obras/some-id", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/obras/:id", () => {
  // Imported lazily so this file can be collected even when @prisma/client has not been
  // generated yet (no DATABASE_URL / no DB in this sandbox).
  let prisma: typeof import("../../../../lib/db/prisma").prisma;
  let crearObra: typeof import("../../../../lib/obra/service").crearObra;
  let PATCH: typeof import("./route").PATCH;
  let SEEDED_CONSTRUCTOR_ID: string;
  let obraId: string;

  beforeEach(async () => {
    if (!hasDatabaseUrl) return;

    ({ prisma } = await import("../../../../lib/db/prisma"));
    ({ crearObra } = await import("../../../../lib/obra/service"));
    ({ PATCH } = await import("./route"));
    ({ SEEDED_CONSTRUCTOR_ID } = await import(
      "../../../../lib/auth/current-constructor"
    ));

    const { seed } = await import("../../../../prisma/seed");
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

  it("should return 200 with the updated obra on valid data", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const response = await PATCH(patchRequest({ ...datosValidos, nombre: "Torre Actualizada" }), {
      params: Promise.resolve({ id: obraId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nombre).toBe("Torre Actualizada");
  });

  it("should return 400 with field errors when a required field is empty", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const response = await PATCH(patchRequest({ ...datosValidos, nombre: "" }), {
      params: Promise.resolve({ id: obraId }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation");
    expect(body.fields).toHaveProperty("nombre");
  });

  it("should return 404 when the obra does not exist", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const response = await PATCH(patchRequest(datosValidos), {
      params: Promise.resolve({ id: "id-inexistente" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("obra_no_encontrada");
  });

  it("should ignore an injected presupuestoInicial — this endpoint only edits obra fields", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const response = await PATCH(
      patchRequest({ ...datosValidos, presupuestoInicial: 9999999 }),
      { params: Promise.resolve({ id: obraId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.presupuestoInicial).toBe(datosValidos.presupuestoInicial);
  });
});
