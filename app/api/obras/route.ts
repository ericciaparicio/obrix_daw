import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crearObra, ObraYaExisteError } from "../../../lib/obra/service";
import { getCurrentConstructorId } from "../../../lib/auth/current-constructor";
import { formatearErroresDeValidacion } from "../../../lib/http/validation-errors";

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
