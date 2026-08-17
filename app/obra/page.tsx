"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ObraActual {
  id: string;
  nombre: string;
  pais: string;
  provincia: string;
  localidad: string;
  direccion: string;
  latitud: number;
  longitud: number;
  fechaInicio: string;
  fechaFin: string | null;
  presupuestoInicial: number | null;
}

type EstadoObra = { status: "cargando" } | { status: "error" } | { status: "ok"; obra: ObraActual };

/**
 * Landing de la obra (Block 3). Client component: la redirección a `/obra/nueva` cuando no hay
 * obra depende del resultado de `GET /api/obras/actual` (ADR-001: la UI llama al endpoint REST,
 * nunca a Prisma/servicio directamente), y `useRouter` de `next/navigation` solo existe del lado
 * del cliente.
 */
export default function ObraPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoObra>({ status: "cargando" });

  useEffect(() => {
    let cancelado = false;

    async function cargarObraActual() {
      try {
        const response = await fetch("/api/obras/actual");

        if (response.status === 404) {
          if (!cancelado) router.push("/obra/nueva");
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

  if (estado.status === "error") {
    return <p role="alert">No se pudo cargar la obra. Intentá de nuevo más tarde.</p>;
  }

  const { obra } = estado;

  return (
    <main>
      <h1>{obra.nombre}</h1>
      <dl>
        <dt>País</dt>
        <dd>{obra.pais}</dd>
        <dt>Provincia</dt>
        <dd>{obra.provincia}</dd>
        <dt>Localidad</dt>
        <dd>{obra.localidad}</dd>
        <dt>Dirección</dt>
        <dd>{obra.direccion}</dd>
        <dt>Fecha de inicio</dt>
        <dd>{obra.fechaInicio}</dd>
        <dt>Fecha de fin</dt>
        <dd>{obra.fechaFin ?? "Sin definir"}</dd>
        <dt>Presupuesto inicial</dt>
        <dd>{obra.presupuestoInicial ?? "Sin definir"}</dd>
      </dl>
      <Link href="/obra/editar">Editar obra</Link>
    </main>
  );
}
