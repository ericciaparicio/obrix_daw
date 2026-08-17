"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { crearObraSchema, obraBaseSchema, presupuestoSchema } from "../../lib/obra/schema";

/**
 * Modo del formulario: "crear" (Block 3, alta combinada obra + presupuesto en un solo `POST`) o
 * "editar" (Block 5, dos guardados independientes vía `PATCH`). En modo "editar", `obraId` y
 * `obraInicial` son obligatorios en la práctica — el único caller de ese modo es
 * `app/obra/editar/page.tsx`, que siempre los provee tras un `GET /api/obras/actual` exitoso —
 * pero quedan opcionales a nivel de tipo para no forzar un union type discriminado que
 * complicaría el resto del componente sin necesidad real (no hay ningún otro caller).
 */
export interface ObraFormProps {
  mode: "crear" | "editar";
  obraId?: string;
  obraInicial?: ObraInicialEditar;
}

/**
 * Forma de los datos con los que se pre-carga el modo "editar" — coincide con lo que devuelve
 * `GET /api/obras/actual` (sin el `id`, que viaja aparte como `obraId`).
 */
export interface ObraInicialEditar {
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

interface FormValues {
  nombre: string;
  pais: string;
  provincia: string;
  localidad: string;
  direccion: string;
  latitud: string;
  longitud: string;
  fechaInicio: string;
  fechaFin: string;
  presupuestoInicial: string;
}

const valoresIniciales: FormValues = {
  nombre: "",
  pais: "",
  provincia: "",
  localidad: "",
  direccion: "",
  latitud: "",
  longitud: "",
  fechaInicio: "",
  fechaFin: "",
  presupuestoInicial: "",
};

const camposTexto: Array<{
  name: "nombre" | "pais" | "provincia" | "localidad" | "direccion";
  label: string;
}> = [
  { name: "nombre", label: "Nombre" },
  { name: "pais", label: "País" },
  { name: "provincia", label: "Provincia" },
  { name: "localidad", label: "Localidad" },
  { name: "direccion", label: "Dirección" },
];

/** Claves de `FormValues` que pertenecen a la sección "datos de la obra" (todo menos presupuesto). */
const camposObraKeys: Array<keyof FormValues> = [
  "nombre",
  "pais",
  "provincia",
  "localidad",
  "direccion",
  "latitud",
  "longitud",
  "fechaInicio",
  "fechaFin",
];

/**
 * `Number("")` da `0` — un valor numérico "válido" — así que hay que forzarlo a `NaN` para que
 * Zod lo trate como "falta el campo" en vez de como "0" (que para latitud sería el ecuador, un
 * valor legítimo).
 */
function aNumero(valor: string): number {
  const limpio = valor.trim();
  return limpio === "" ? NaN : Number(limpio);
}

/** `<input type="date">` espera `yyyy-MM-dd`; el ISO que devuelve la API trae hora y offset. */
function aFechaInput(iso: string): string {
  return iso.slice(0, 10);
}

/** Convierte los datos de la obra actual (Block 4/GET actual) al `FormValues` de pre-carga. */
function valoresDesdeObraInicial(obra: ObraInicialEditar): FormValues {
  return {
    nombre: obra.nombre,
    pais: obra.pais,
    provincia: obra.provincia,
    localidad: obra.localidad,
    direccion: obra.direccion,
    latitud: String(obra.latitud),
    longitud: String(obra.longitud),
    fechaInicio: aFechaInput(obra.fechaInicio),
    fechaFin: obra.fechaFin ? aFechaInput(obra.fechaFin) : "",
    presupuestoInicial:
      obra.presupuestoInicial != null ? String(obra.presupuestoInicial) : "",
  };
}

function construirPayloadObra(values: FormValues): unknown {
  return {
    nombre: values.nombre,
    pais: values.pais,
    provincia: values.provincia,
    localidad: values.localidad,
    direccion: values.direccion,
    latitud: aNumero(values.latitud),
    longitud: aNumero(values.longitud),
    fechaInicio: values.fechaInicio,
    fechaFin: values.fechaFin.trim() === "" ? null : values.fechaFin,
  };
}

function construirPayloadPresupuesto(values: FormValues): unknown {
  return {
    presupuestoInicial: aNumero(values.presupuestoInicial),
  };
}

/** Modo "crear" (Block 3): combina los campos de obra + presupuesto en un solo payload. */
function construirPayloadCrear(values: FormValues): unknown {
  return {
    ...(construirPayloadObra(values) as Record<string, unknown>),
    ...(construirPayloadPresupuesto(values) as Record<string, unknown>),
  };
}

/**
 * Mismo criterio que `formatearErroresDeValidacion` en `app/api/obras/route.ts`: junta todos los
 * issues en un objeto `{ campo: mensaje }`, quedándose con el primero por campo. No se reusa esa
 * función directamente porque vive en código de servidor (importa el servicio, que a su vez
 * importa Prisma) que no debe entrar al bundle del cliente.
 */
function mapearErroresZod(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "_root");
    if (!(campo in fields)) {
      fields[campo] = issue.message;
    }
  }

  return fields;
}

/**
 * Modo "editar" separa el guardado en dos secciones independientes (obra vs. presupuesto), cada
 * una contra su propio endpoint `PATCH` (Block 4). Al re-validar una sección hay que limpiar SOLO
 * los errores que le pertenecen a esa sección antes de fusionar los nuevos — si no, un error viejo
 * de la otra sección (o uno ya corregido de esta) puede quedar pisado o colgado.
 */
function fusionarErrores(
  previos: Record<string, string>,
  claves: readonly string[],
  nuevos: Record<string, string>
): Record<string, string> {
  const siguiente = { ...previos };
  for (const clave of claves) {
    delete siguiente[clave];
  }
  return { ...siguiente, ...nuevos };
}

const MENSAJE_ERROR_INESPERADO = "Ocurrió un error inesperado. Intentá de nuevo.";
const MENSAJE_OBRA_NO_ENCONTRADA = "No encontramos tu obra. Te redirigimos...";

export default function ObraForm(props: ObraFormProps) {
  const { mode, obraId, obraInicial } = props;

  const router = useRouter();
  const [values, setValues] = useState<FormValues>(
    mode === "editar" && obraInicial ? valoresDesdeObraInicial(obraInicial) : valoresIniciales
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mensajeGeneral, setMensajeGeneral] = useState<string | null>(null);
  const [enviandoObra, setEnviandoObra] = useState(false);
  const [enviandoPresupuesto, setEnviandoPresupuesto] = useState(false);

  function actualizarCampo(name: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmitCrear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = construirPayloadCrear(values);
    const resultado = crearObraSchema.safeParse(payload);

    // El cliente valida primero para feedback inmediato, pero nunca confía solo en esto: la
    // respuesta 400 del servidor (más abajo) es la fuente de verdad real.
    if (!resultado.success) {
      setErrors(mapearErroresZod(resultado.error));
      setMensajeGeneral(null);
      return;
    }

    setErrors({});
    setMensajeGeneral(null);
    setEnviandoObra(true);

    try {
      const response = await fetch("/api/obras", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(resultado.data),
      });

      if (response.status === 201) {
        router.push("/obra");
        return;
      }

      if (response.status === 400) {
        const body = await response.json();
        setErrors(body.fields ?? {});
        return;
      }

      if (response.status === 409) {
        setMensajeGeneral("Ya tenés una obra registrada");
        router.push("/obra");
        return;
      }

      setMensajeGeneral(MENSAJE_ERROR_INESPERADO);
    } catch {
      setMensajeGeneral(MENSAJE_ERROR_INESPERADO);
    } finally {
      setEnviandoObra(false);
    }
  }

  /**
   * Modo "editar" — guarda los campos de la obra (todo menos presupuesto) contra
   * `PATCH /api/obras/:id`, de forma independiente del guardado del presupuesto (ver
   * `handleSubmitPresupuestoEditar`): son dos endpoints distintos (Block 4).
   */
  async function handleSubmitObraEditar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode !== "editar" || !obraId) return;

    const payload = construirPayloadObra(values);
    const resultado = obraBaseSchema.safeParse(payload);

    if (!resultado.success) {
      setErrors((prev) =>
        fusionarErrores(prev, camposObraKeys, mapearErroresZod(resultado.error))
      );
      setMensajeGeneral(null);
      return;
    }

    setErrors((prev) => fusionarErrores(prev, camposObraKeys, {}));
    setMensajeGeneral(null);
    setEnviandoObra(true);

    try {
      const response = await fetch(`/api/obras/${obraId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(resultado.data),
      });

      if (response.status === 200) {
        return;
      }

      if (response.status === 400) {
        const body = await response.json();
        setErrors((prev) => fusionarErrores(prev, camposObraKeys, body.fields ?? {}));
        return;
      }

      if (response.status === 404) {
        setMensajeGeneral(MENSAJE_OBRA_NO_ENCONTRADA);
        router.push("/obra");
        return;
      }

      setMensajeGeneral(MENSAJE_ERROR_INESPERADO);
    } catch {
      setMensajeGeneral(MENSAJE_ERROR_INESPERADO);
    } finally {
      setEnviandoObra(false);
    }
  }

  /** Modo "editar" — guarda el presupuesto contra `PATCH /api/obras/:id/presupuesto`. */
  async function handleSubmitPresupuestoEditar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode !== "editar" || !obraId) return;

    const payload = construirPayloadPresupuesto(values);
    const resultado = presupuestoSchema.safeParse(payload);

    if (!resultado.success) {
      setErrors((prev) =>
        fusionarErrores(prev, ["presupuestoInicial"], mapearErroresZod(resultado.error))
      );
      setMensajeGeneral(null);
      return;
    }

    setErrors((prev) => fusionarErrores(prev, ["presupuestoInicial"], {}));
    setMensajeGeneral(null);
    setEnviandoPresupuesto(true);

    try {
      const response = await fetch(`/api/obras/${obraId}/presupuesto`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(resultado.data),
      });

      if (response.status === 200) {
        return;
      }

      if (response.status === 400) {
        const body = await response.json();
        setErrors((prev) =>
          fusionarErrores(prev, ["presupuestoInicial"], body.fields ?? {})
        );
        return;
      }

      if (response.status === 404) {
        setMensajeGeneral(MENSAJE_OBRA_NO_ENCONTRADA);
        router.push("/obra");
        return;
      }

      setMensajeGeneral(MENSAJE_ERROR_INESPERADO);
    } catch {
      setMensajeGeneral(MENSAJE_ERROR_INESPERADO);
    } finally {
      setEnviandoPresupuesto(false);
    }
  }

  const camposObraJsx = (
    <>
      {camposTexto.map(({ name, label }) => (
        <div key={name} style={estiloCampo}>
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            name={name}
            type="text"
            value={values[name]}
            onChange={(e) => actualizarCampo(name, e.target.value)}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
            style={estiloInput}
          />
          {errors[name] && (
            <p id={`${name}-error`} data-testid={`error-${name}`} style={estiloError}>
              {errors[name]}
            </p>
          )}
        </div>
      ))}

      <div style={estiloCampo}>
        <label htmlFor="latitud">Latitud</label>
        <input
          id="latitud"
          name="latitud"
          type="text"
          inputMode="decimal"
          value={values.latitud}
          onChange={(e) => actualizarCampo("latitud", e.target.value)}
          aria-describedby={errors.latitud ? "latitud-error" : undefined}
          style={estiloInput}
        />
        {errors.latitud && (
          <p id="latitud-error" data-testid="error-latitud" style={estiloError}>
            {errors.latitud}
          </p>
        )}
      </div>

      <div style={estiloCampo}>
        <label htmlFor="longitud">Longitud</label>
        <input
          id="longitud"
          name="longitud"
          type="text"
          inputMode="decimal"
          value={values.longitud}
          onChange={(e) => actualizarCampo("longitud", e.target.value)}
          aria-describedby={errors.longitud ? "longitud-error" : undefined}
          style={estiloInput}
        />
        {errors.longitud && (
          <p id="longitud-error" data-testid="error-longitud" style={estiloError}>
            {errors.longitud}
          </p>
        )}
      </div>

      <div style={estiloCampo}>
        <label htmlFor="fechaInicio">Fecha de inicio</label>
        <input
          id="fechaInicio"
          name="fechaInicio"
          type="date"
          value={values.fechaInicio}
          onChange={(e) => actualizarCampo("fechaInicio", e.target.value)}
          aria-describedby={errors.fechaInicio ? "fechaInicio-error" : undefined}
          style={estiloInput}
        />
        {errors.fechaInicio && (
          <p id="fechaInicio-error" data-testid="error-fechaInicio" style={estiloError}>
            {errors.fechaInicio}
          </p>
        )}
      </div>

      <div style={estiloCampo}>
        <label htmlFor="fechaFin">Fecha de fin (opcional)</label>
        <input
          id="fechaFin"
          name="fechaFin"
          type="date"
          value={values.fechaFin}
          onChange={(e) => actualizarCampo("fechaFin", e.target.value)}
          aria-describedby={errors.fechaFin ? "fechaFin-error" : undefined}
          style={estiloInput}
        />
        {errors.fechaFin && (
          <p id="fechaFin-error" data-testid="error-fechaFin" style={estiloError}>
            {errors.fechaFin}
          </p>
        )}
      </div>
    </>
  );

  const campoPresupuestoJsx = (
    <div style={estiloCampo}>
      <label htmlFor="presupuestoInicial">Presupuesto inicial (ARS)</label>
      <input
        id="presupuestoInicial"
        name="presupuestoInicial"
        type="text"
        inputMode="numeric"
        value={values.presupuestoInicial}
        onChange={(e) => actualizarCampo("presupuestoInicial", e.target.value)}
        aria-describedby={errors.presupuestoInicial ? "presupuestoInicial-error" : undefined}
        style={estiloInput}
      />
      {errors.presupuestoInicial && (
        <p
          id="presupuestoInicial-error"
          data-testid="error-presupuestoInicial"
          style={estiloError}
        >
          {errors.presupuestoInicial}
        </p>
      )}
    </div>
  );

  if (mode === "editar") {
    return (
      <div>
        {mensajeGeneral && (
          <p role="alert" style={estiloMensajeGeneral}>
            {mensajeGeneral}
          </p>
        )}

        <form
          onSubmit={handleSubmitObraEditar}
          noValidate
          data-testid="obra-form"
          style={estiloFormulario}
        >
          {camposObraJsx}
          <button type="submit" disabled={enviandoObra}>
            {enviandoObra ? "Guardando..." : "Guardar datos de la obra"}
          </button>
        </form>

        <form
          onSubmit={handleSubmitPresupuestoEditar}
          noValidate
          data-testid="presupuesto-form"
          style={estiloFormulario}
        >
          {campoPresupuestoJsx}
          <button type="submit" disabled={enviandoPresupuesto}>
            {enviandoPresupuesto ? "Guardando..." : "Guardar presupuesto"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmitCrear}
      noValidate
      data-testid="obra-form"
      style={estiloFormulario}
    >
      {mensajeGeneral && (
        <p role="alert" style={estiloMensajeGeneral}>
          {mensajeGeneral}
        </p>
      )}

      {camposObraJsx}
      {campoPresupuestoJsx}

      <button type="submit" disabled={enviandoObra}>
        {enviandoObra ? "Guardando..." : "Guardar obra"}
      </button>
    </form>
  );
}

/**
 * NFR-01 (usable sin scroll horizontal desde 320px de ancho): sin anchos fijos en px — todo el
 * layout usa `width: "100%"` (fluido, se adapta al contenedor) + `boxSizing: "border-box"` (para
 * que el padding no desborde ese 100%), y `maxWidth` solo como tope superior, nunca como ancho
 * fijo. Ver el comentario en ObraForm.test.tsx sobre por qué el test verifica estos estilos en
 * vez de medir scroll real (jsdom no calcula layout). Reusado tal cual por ambos `<form>` del
 * modo "editar".
 */
const estiloFormulario: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  width: "100%",
  maxWidth: "480px",
  boxSizing: "border-box",
};

const estiloCampo: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  width: "100%",
};

const estiloInput: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
};

const estiloError: CSSProperties = {
  color: "#b00020",
  margin: 0,
  fontSize: "0.875rem",
};

const estiloMensajeGeneral: CSSProperties = {
  color: "#b00020",
};
