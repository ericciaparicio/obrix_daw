import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actualizarPresupuesto, ObraNoEncontradaError } from "../../../../../lib/obra/service";
import { formatearErroresDeValidacion } from "../../../../../lib/http/validation-errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const obra = await actualizarPresupuesto(id, body);
    return NextResponse.json(obra, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "validation", fields: formatearErroresDeValidacion(error) },
        { status: 400 }
      );
    }

    if (error instanceof ObraNoEncontradaError) {
      return NextResponse.json({ error: "obra_no_encontrada" }, { status: 404 });
    }

    throw error;
  }
}
