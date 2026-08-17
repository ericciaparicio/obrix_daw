"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { crearObraSchema } from "../../lib/obra/schema";

/**
 * Modo del formulario. Hoy solo existe "crear" (Block 3). El spec de FEAT-001 anticipa que el
 * Block 5 agrega "editar" a este mismo componente (pre-carga de valores + `PATCH` en vez de
 * `POST`) — por eso el estado y los helpers de abajo (`valoresIniciales`, `construirPayload`,
 * `mapearErroresZod`) están separados de `handleSubmit` en piezas chicas y reusables, para que
 * agregar ese modo sea extender esta lógica, no reescribirla.
 */
export interface ObraFormProps {
  mode: "crear";
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

/**
 * `Number("")` da `0` — un valor numérico "válido" — así que hay que forzarlo a `NaN` para que
 * Zod lo trate como "falta el campo" en vez de como "0" (que para latitud sería el ecuador, un
 * valor legítimo).
 */
function aNumero(valor: string): number {
  const limpio = valor.trim();
  return limpio === "" ? NaN : Number(limpio);
}

function construirPayload(values: FormValues): unknown {
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
    presupuestoInicial: aNumero(values.presupuestoInicial),
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

export default function ObraForm({ mode }: ObraFormProps) {
  void mode; // Único valor posible hoy; Block 5 lo va a usar para bifurcar a "editar".

  const router = useRouter();
  const [values, setValues] = useState<FormValues>(valoresIniciales);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mensajeGeneral, setMensajeGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function actualizarCampo(name: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = construirPayload(values);
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
    setEnviando(true);

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

      setMensajeGeneral("Ocurrió un error inesperado. Intentá de nuevo.");
    } catch {
      setMensajeGeneral("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="obra-form" style={estiloFormulario}>
      {mensajeGeneral && (
        <p role="alert" style={estiloMensajeGeneral}>
          {mensajeGeneral}
        </p>
      )}

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

      <div style={estiloCampo}>
        <label htmlFor="presupuestoInicial">Presupuesto inicial (ARS)</label>
        <input
          id="presupuestoInicial"
          name="presupuestoInicial"
          type="text"
          inputMode="numeric"
          value={values.presupuestoInicial}
          onChange={(e) => actualizarCampo("presupuestoInicial", e.target.value)}
          aria-describedby={
            errors.presupuestoInicial ? "presupuestoInicial-error" : undefined
          }
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

      <button type="submit" disabled={enviando}>
        {enviando ? "Guardando..." : "Guardar obra"}
      </button>
    </form>
  );
}

/**
 * NFR-01 (usable sin scroll horizontal desde 320px de ancho): sin anchos fijos en px — todo el
 * layout usa `width: "100%"` (fluido, se adapta al contenedor) + `boxSizing: "border-box"` (para
 * que el padding no desborde ese 100%), y `maxWidth` solo como tope superior, nunca como ancho
 * fijo. Ver el comentario en ObraForm.test.tsx sobre por qué el test verifica estos estilos en
 * vez de medir scroll real (jsdom no calcula layout).
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
