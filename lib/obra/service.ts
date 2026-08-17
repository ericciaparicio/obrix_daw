import { prisma } from "../db/prisma";
import { crearObraSchema, obraBaseSchema, presupuestoSchema } from "./schema";

/**
 * Error de negocio: el constructor ya tiene una obra registrada (FR-03 / AC-04). La constraint
 * `constructorId @unique` en el modelo `Obra` (Block 1) es la defensa contra condiciones de carrera;
 * este chequeo de aplicación es la que produce un mensaje claro en el caso normal (sin carrera).
 */
export class ObraYaExisteError extends Error {
  constructor() {
    super("El constructor ya tiene una obra registrada");
    this.name = "ObraYaExisteError";
  }
}

/**
 * Error de negocio: no existe una obra con el `id` dado (Block 4 — edición). Mismo estilo que
 * `ObraYaExisteError`: una clase por error de negocio para que el caller la distinga con
 * `instanceof` y la mapee al código HTTP correspondiente (404 en este caso).
 */
export class ObraNoEncontradaError extends Error {
  constructor() {
    super("No existe una obra con ese id");
    this.name = "ObraNoEncontradaError";
  }
}

/**
 * Alta combinada de obra + presupuesto inicial (AC-01, AC-05). Valida con Zod (lanza `z.ZodError`
 * si la entrada es inválida — el caller la mapea a 400), después revisa si el constructor ya tiene
 * una obra (lanza `ObraYaExisteError` si es así — el caller la mapea a 409), y si no, crea la obra
 * con `presupuestoInicial` en la misma escritura.
 */
export async function crearObra(constructorId: string, input: unknown) {
  const data = crearObraSchema.parse(input);

  const obraExistente = await prisma.obra.findUnique({
    where: { constructorId },
  });

  if (obraExistente) {
    throw new ObraYaExisteError();
  }

  return prisma.obra.create({
    data: {
      constructorId,
      nombre: data.nombre,
      pais: data.pais,
      provincia: data.provincia,
      localidad: data.localidad,
      direccion: data.direccion,
      latitud: data.latitud,
      longitud: data.longitud,
      fechaInicio: new Date(data.fechaInicio),
      fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
      presupuestoInicial: data.presupuestoInicial,
    },
  });
}

/**
 * Edición de los datos de la obra (AC-07, AC-08, AC-09). Revalida con el mismo `obraBaseSchema`
 * usado en el alta — no acepta campos obligatorios vacíos y vuelve a chequear `fechaFin >=
 * fechaInicio` — y actualiza únicamente los campos de obra (nunca `presupuestoInicial`, que tiene
 * su propio endpoint/función). Lanza `ObraNoEncontradaError` si `id` no corresponde a ninguna obra.
 */
export async function actualizarObra(id: string, input: unknown) {
  const data = obraBaseSchema.parse(input);

  const obraExistente = await prisma.obra.findUnique({ where: { id } });

  if (!obraExistente) {
    throw new ObraNoEncontradaError();
  }

  return prisma.obra.update({
    where: { id },
    data: {
      nombre: data.nombre,
      pais: data.pais,
      provincia: data.provincia,
      localidad: data.localidad,
      direccion: data.direccion,
      latitud: data.latitud,
      longitud: data.longitud,
      fechaInicio: new Date(data.fechaInicio),
      fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
    },
  });
}

/**
 * Edición del presupuesto inicial (AC-10, AC-11). Revalida con `presupuestoSchema` y actualiza
 * únicamente `presupuestoInicial`, sin tocar el resto de los campos de la obra. Lanza
 * `ObraNoEncontradaError` si `id` no corresponde a ninguna obra (mismo estilo que `actualizarObra`).
 */
export async function actualizarPresupuesto(id: string, input: unknown) {
  const data = presupuestoSchema.parse(input);

  const obraExistente = await prisma.obra.findUnique({ where: { id } });

  if (!obraExistente) {
    throw new ObraNoEncontradaError();
  }

  return prisma.obra.update({
    where: { id },
    data: {
      presupuestoInicial: data.presupuestoInicial,
    },
  });
}
