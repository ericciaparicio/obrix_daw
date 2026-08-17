import { z } from "zod";

/**
 * Esquemas Zod para la obra (FEAT-001, Block 2). `obraBaseSchema` valida los campos propios de la
 * obra (reusado por Block 4 para edición); `presupuestoSchema` valida el presupuesto inicial por
 * separado (reusado por Block 4 para editar solo el presupuesto); `crearObraSchema` combina ambos
 * para el alta combinada de este bloque (FR-01 + FR-04 en una sola escritura).
 */

const textoObligatorio = z
  .string()
  .trim()
  .min(1, "Campo obligatorio")
  .max(200, "Máximo 200 caracteres");

/**
 * "Fecha ISO válida": se valida que la cadena sea parseable a una fecha real (`Date.parse`), no un
 * regex estricto de formato ISO 8601 — el PRD solo exige rechazar fechas inválidas (AC-02), no
 * imponer un formato de entrada específico.
 */
const fechaIso = z
  .string()
  .min(1, "Campo obligatorio")
  .refine((valor) => !Number.isNaN(Date.parse(valor)), "Fecha inválida");

const latitudField = z
  .number()
  .finite("Debe ser un número")
  .min(-90, "La latitud debe estar entre -90 y 90")
  .max(90, "La latitud debe estar entre -90 y 90");

const longitudField = z
  .number()
  .finite("Debe ser un número")
  .min(-180, "La longitud debe estar entre -180 y 180")
  .max(180, "La longitud debe estar entre -180 y 180");

const presupuestoField = z
  .number("Debe ser un número")
  .int("El presupuesto debe ser un número entero")
  .positive("El presupuesto debe ser mayor a cero");

const obraFieldsShape = {
  nombre: textoObligatorio,
  pais: textoObligatorio,
  provincia: textoObligatorio,
  localidad: textoObligatorio,
  direccion: textoObligatorio,
  latitud: latitudField,
  longitud: longitudField,
  fechaInicio: fechaIso,
  fechaFin: fechaIso.optional().nullable(),
};

/**
 * Agrega el error "fechaFin anterior a fechaInicio" (AC-03) sin frenar el resto de la validación:
 * `superRefine` corre después de que Zod ya recolectó los errores de los campos individuales, así
 * que el 400 final incluye TODOS los errores juntos (AC-02 + AC-03 + AC-06 simultáneos), nunca solo
 * el primero.
 */
function validarRangoDeFechas(
  data: { fechaInicio: string; fechaFin?: string | null },
  ctx: z.RefinementCtx
) {
  if (!data.fechaFin) return;

  const inicio = new Date(data.fechaInicio);
  const fin = new Date(data.fechaFin);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return;

  if (fin < inicio) {
    ctx.addIssue({
      code: "custom",
      path: ["fechaFin"],
      message: "La fecha de fin debe ser igual o posterior a la fecha de inicio",
    });
  }
}

export const obraBaseSchema = z
  .object(obraFieldsShape)
  .superRefine(validarRangoDeFechas);

export const presupuestoSchema = z.object({
  presupuestoInicial: presupuestoField,
});

export const crearObraSchema = z
  .object({
    ...obraFieldsShape,
    presupuestoInicial: presupuestoField,
  })
  .superRefine(validarRangoDeFechas);

export type CrearObraInput = z.infer<typeof crearObraSchema>;
