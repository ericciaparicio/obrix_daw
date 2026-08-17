import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crearObra, ObraYaExisteError } from "../../../lib/obra/service";
import { getCurrentConstructorId } from "../../../lib/auth/current-constructor";

/**
 * Junta TODOS los issues de Zod en un solo objeto `{ campo: mensaje }` (no falla-rápido en el
 * primero — spec Block 2, "Error handling"). Si un campo tiene más de un issue, se conserva el
 * primero encontrado.
 */
function formatearErroresDeValidacion(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const campo = issue.path.join(".") || "_root";
    if (!(campo in fields)) {
      fields[campo] = issue.message;
    }
  }

  return fields;
}

export async function POST(request: NextRequest) {
  const constructorId = getCurrentConstructorId();
  const body = await request.json();

  try {
    const obra = await crearObra(constructorId, body);
    return NextResponse.json(obra, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation", fields: formatearErroresDeValidacion(error) },
        { status: 400 }
      );
    }

    if (error instanceof ObraYaExisteError) {
      return NextResponse.json({ error: "obra_ya_existe" }, { status: 409 });
    }

    throw error;
  }
}
