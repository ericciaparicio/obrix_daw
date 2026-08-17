import { z } from "zod";

/**
 * Junta TODOS los issues de Zod en un solo objeto `{ campo: mensaje }` (no falla-rápido en el
 * primero). Si un campo tiene más de un issue, se conserva el primero encontrado.
 */
export function formatearErroresDeValidacion(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const campo = issue.path.join(".") || "_root";
    if (!(campo in fields)) {
      fields[campo] = issue.message;
    }
  }

  return fields;
}
