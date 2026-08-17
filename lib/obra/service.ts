import { prisma } from "../db/prisma";
import { crearObraSchema } from "./schema";

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
