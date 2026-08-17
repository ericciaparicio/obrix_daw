import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db/prisma";
import { getCurrentConstructorId } from "../../../../lib/auth/current-constructor";

/**
 * Obra del constructor actual (Block 3). Un `findUnique` directo sobre `constructorId` no
 * justifica una función de servicio propia (spec, "Files" de Block 3) — se queda en la capa de
 * ruta, igual patrón que `POST /api/obras` (Block 2) para resolver identidad.
 */
export async function GET() {
  const constructorId = getCurrentConstructorId();

  const obra = await prisma.obra.findUnique({
    where: { constructorId },
  });

  if (!obra) {
    return NextResponse.json({ error: "sin_obra" }, { status: 404 });
  }

  return NextResponse.json(obra, { status: 200 });
}
