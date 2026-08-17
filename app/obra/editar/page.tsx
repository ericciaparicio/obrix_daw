"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ObraForm from "../../../components/obra/ObraForm";
import type { ObraInicialEditar } from "../../../components/obra/ObraForm";

interface ObraActual extends ObraInicialEditar {
  id: string;
}

type EstadoObra =
  | { status: "cargando" }
  | { status: "sin_obra" }
  | { status: "error" }
  | { status: "ok"; obra: ObraActual };

/**
 * Página de edición (Block 5). Mismo patrón que `app/obra/page.tsx` (Block 3): client component
 * porque la redirección depende del resultado de `GET /api/obras/actual` (ADR-001: la UI llama al
 * endpoint REST, nunca a Prisma/servicio directamente) y `useRouter` solo existe del lado del
 * cliente. A diferencia de la landing (que redirige en silencio a `/obra/nueva` en un 404), acá el
 * 404 además muestra un mensaje general — mismo criterio que el 409 de `ObraForm` en modo "crear".
 */
export default function EditarObraPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoObra>({ status: "cargando" });

  useEffect(() => {
    let cancelado = false;

    async function cargarObraActual() {
      try {
        const response = await fetch("/api/obras/actual");

        if (response.status === 404) {
          if (!cancelado) {
            setEstado({ status: "sin_obra" });
            router.push("/obra");
          }
          return;
        }

        if (!response.ok) {
          if (!cancelado) setEstado({ status: "error" });
          return;
        }

        const obra = (await response.json()) as ObraActual;
        if (!cancelado) setEstado({ status: "ok", obra });
      } catch {
        if (!cancelado) setEstado({ status: "error" });
      }
    }

    cargarObraActual();

    return () => {
      cancelado = true;
    };
  }, [router]);

  if (estado.status === "cargando") {
    return <p>Cargando...</p>;
  }

  if (estado.status === "sin_obra") {
    return <p role="alert">No encontramos tu obra. Te redirigimos...</p>;
  }

  if (estado.status === "error") {
    return <p role="alert">No se pudo cargar la obra. Intentá de nuevo más tarde.</p>;
  }

  const { obra } = estado;

  return (
    <main>
      <h1>Editar obra</h1>
      <ObraForm mode="editar" obraId={obra.id} obraInicial={obra} />
    </main>
  );
}
