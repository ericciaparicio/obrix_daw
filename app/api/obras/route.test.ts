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

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/obras", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/obras", () => {
  // Imported lazily so this file can be collected even when @prisma/client has not been
  // generated yet (no DATABASE_URL / no DB in this sandbox).
  let prisma: typeof import("../../../lib/db/prisma").prisma;
  let POST: typeof import("./route").POST;
  let SEEDED_CONSTRUCTOR_ID: string;

  beforeEach(async () => {
    if (!hasDatabaseUrl) return;

    ({ prisma } = await import("../../../lib/db/prisma"));
    ({ POST } = await import("./route"));
    ({ SEEDED_CONSTRUCTOR_ID } = await import(
      "../../../lib/auth/current-constructor"
    ));

    const { seed } = await import("../../../prisma/seed");
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

  it("should return 201 with the created obra on valid data", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const response = await POST(postRequest(datosValidos));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.nombre).toBe(datosValidos.nombre);
    expect(body.id).toBeDefined();
  });

  it("should return 400 with field errors when a required field is missing", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    const { nombre: _omitido, ...datosIncompletos } = datosValidos;
    const response = await POST(postRequest(datosIncompletos));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("validation");
    expect(body.fields).toHaveProperty("nombre");
  });

  it("should return 409 when the constructor already has an obra", async () => {
    if (!hasDatabaseUrl) {
      console.log("SKIP: no DATABASE_URL configured — nothing modified.");
      return;
    }

    await POST(postRequest(datosValidos));
    const response = await POST(postRequest({ ...datosValidos, nombre: "Torre Sur" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("obra_ya_existe");
  });
});
