// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ObraForm from "./ObraForm";
import type { ObraInicialEditar } from "./ObraForm";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const datosValidos = {
  nombre: "Torre Norte",
  pais: "Argentina",
  provincia: "Buenos Aires",
  localidad: "La Plata",
  direccion: "Calle 7 123",
  latitud: "-34.9214",
  longitud: "-57.9544",
  fechaInicio: "2026-01-01",
  fechaFin: "2026-12-31",
  presupuestoInicial: "1000000",
};

function llenarFormularioValido() {
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: datosValidos.nombre } });
  fireEvent.change(screen.getByLabelText("País"), { target: { value: datosValidos.pais } });
  fireEvent.change(screen.getByLabelText("Provincia"), {
    target: { value: datosValidos.provincia },
  });
  fireEvent.change(screen.getByLabelText("Localidad"), {
    target: { value: datosValidos.localidad },
  });
  fireEvent.change(screen.getByLabelText("Dirección"), {
    target: { value: datosValidos.direccion },
  });
  fireEvent.change(screen.getByLabelText("Latitud"), { target: { value: datosValidos.latitud } });
  fireEvent.change(screen.getByLabelText("Longitud"), {
    target: { value: datosValidos.longitud },
  });
  fireEvent.change(screen.getByLabelText("Fecha de inicio"), {
    target: { value: datosValidos.fechaInicio },
  });
  fireEvent.change(screen.getByLabelText("Fecha de fin (opcional)"), {
    target: { value: datosValidos.fechaFin },
  });
  fireEvent.change(screen.getByLabelText("Presupuesto inicial (ARS)"), {
    target: { value: datosValidos.presupuestoInicial },
  });
}

beforeEach(() => {
  pushMock.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

// `test.globals` is not enabled in vitest.config.ts (kept off on purpose so pre-existing
// Node-environment tests are unaffected), so @testing-library/react's auto-cleanup — which
// relies on a global `afterEach` — does not kick in on its own; register it explicitly instead.
afterEach(cleanup);

describe("ObraForm (modo crear)", () => {
  it("muestra un error por cada campo obligatorio vacío al enviar (AC-02)", async () => {
    render(<ObraForm mode="crear" />);

    // Se completa presupuesto para aislar el caso de campos de obra faltantes del de AC-06.
    fireEvent.change(screen.getByLabelText("Presupuesto inicial (ARS)"), {
      target: { value: "1000000" },
    });

    fireEvent.submit(screen.getByTestId("obra-form"));

    const camposObligatorios = [
      "nombre",
      "pais",
      "provincia",
      "localidad",
      "direccion",
      "latitud",
      "longitud",
      "fechaInicio",
    ];

    for (const campo of camposObligatorios) {
      expect(await screen.findByTestId(`error-${campo}`)).toBeInTheDocument();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("muestra error si la fecha de fin es anterior a la fecha de inicio (AC-03)", async () => {
    render(<ObraForm mode="crear" />);
    llenarFormularioValido();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByLabelText("Fecha de fin (opcional)"), {
      target: { value: "2026-01-01" },
    });

    fireEvent.submit(screen.getByTestId("obra-form"));

    expect(await screen.findByTestId("error-fechaFin")).toHaveTextContent(
      "La fecha de fin debe ser igual o posterior a la fecha de inicio"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["0", "-100", "abc"])(
    "muestra error si el presupuesto es inválido: %s (AC-06)",
    async (valorInvalido) => {
      render(<ObraForm mode="crear" />);
      llenarFormularioValido();
      fireEvent.change(screen.getByLabelText("Presupuesto inicial (ARS)"), {
        target: { value: valorInvalido },
      });

      fireEvent.submit(screen.getByTestId("obra-form"));

      expect(await screen.findByTestId("error-presupuestoInicial")).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it("un envío válido llama a POST /api/obras y redirige a /obra (AC-01, AC-05)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 201,
      json: async () => ({ id: "obra-1", ...datosValidos }),
    } as Response);

    render(<ObraForm mode="crear" />);
    llenarFormularioValido();
    fireEvent.submit(screen.getByTestId("obra-form"));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/obra"));

    expect(fetch).toHaveBeenCalledWith(
      "/api/obras",
      expect.objectContaining({ method: "POST" })
    );

    const llamada = vi.mocked(fetch).mock.calls[0];
    const opciones = llamada[1] as RequestInit;
    const cuerpoEnviado = JSON.parse(opciones.body as string);
    expect(cuerpoEnviado.nombre).toBe(datosValidos.nombre);
    expect(cuerpoEnviado.presupuestoInicial).toBe(1000000);
  });

  it("un 409 del servidor muestra el mensaje general y redirige a /obra (AC-04)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 409,
      json: async () => ({ error: "obra_ya_existe" }),
    } as Response);

    render(<ObraForm mode="crear" />);
    llenarFormularioValido();
    fireEvent.submit(screen.getByTestId("obra-form"));

    expect(await screen.findByText("Ya tenés una obra registrada")).toBeInTheDocument();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/obra"));
  });

  it("el layout no depende de anchos fijos mayores a 320px (NFR-01)", () => {
    /**
     * jsdom no calcula layout real (no hay `scrollWidth` ni viewport), así que medir "scroll
     * horizontal" literalmente no es significativo en este entorno de test. Como proxy
     * defendible de NFR-01: el formulario y cada input declaran `width: 100%` (fluido, se
     * adapta al contenedor) y ningún ancho fijo en píxeles — si un cambio futuro introdujera un
     * `width` fijo mayor a 320px, este test lo detecta sin necesitar un browser real.
     */
    render(<ObraForm mode="crear" />);

    const formulario = screen.getByTestId("obra-form");
    expect(formulario.style.width).toBe("100%");
    expect(formulario.style.boxSizing).toBe("border-box");

    const inputs = formulario.querySelectorAll("input");
    expect(inputs.length).toBeGreaterThan(0);

    inputs.forEach((input) => {
      expect(input.style.width).toBe("100%");
      expect(input.style.boxSizing).toBe("border-box");
      expect(/^\d+(\.\d+)?px$/.test(input.style.width)).toBe(false);
    });
  });
});

const obraInicial: ObraInicialEditar = {
  nombre: "Torre Norte",
  pais: "Argentina",
  provincia: "Buenos Aires",
  localidad: "La Plata",
  direccion: "Calle 7 123",
  latitud: -34.9214,
  longitud: -57.9544,
  fechaInicio: "2026-01-01T00:00:00.000Z",
  fechaFin: "2026-12-31T00:00:00.000Z",
  presupuestoInicial: 1000000,
};

describe("ObraForm (modo editar)", () => {
  it("guarda un cambio válido en los datos de la obra vía PATCH /api/obras/:id (AC-07)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      json: async () => ({ id: "obra-1", ...obraInicial, nombre: "Torre Sur" }),
    } as Response);

    render(<ObraForm mode="editar" obraId="obra-1" obraInicial={obraInicial} />);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Torre Sur" } });
    fireEvent.submit(screen.getByTestId("obra-form"));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/obras/obra-1",
        expect.objectContaining({ method: "PATCH" })
      )
    );

    const llamada = vi.mocked(fetch).mock.calls[0];
    const opciones = llamada[1] as RequestInit;
    const cuerpoEnviado = JSON.parse(opciones.body as string);
    expect(cuerpoEnviado.nombre).toBe("Torre Sur");
    expect(cuerpoEnviado.presupuestoInicial).toBeUndefined();
  });

  it("muestra error si se deja vacío un campo obligatorio al editar (AC-08)", async () => {
    render(<ObraForm mode="editar" obraId="obra-1" obraInicial={obraInicial} />);

    // Confirma que estamos ejercitando el formulario de edición (dos secciones separadas), no el
    // de alta: si el modo "editar" no separara ambas secciones, no existiría "presupuesto-form".
    expect(screen.getByTestId("presupuesto-form")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "" } });
    fireEvent.submit(screen.getByTestId("obra-form"));

    expect(await screen.findByTestId("error-nombre")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("muestra error si la fecha de fin editada queda antes que la fecha de inicio (AC-09)", async () => {
    render(<ObraForm mode="editar" obraId="obra-1" obraInicial={obraInicial} />);

    fireEvent.change(screen.getByLabelText("Fecha de fin (opcional)"), {
      target: { value: "2025-01-01" },
    });
    fireEvent.submit(screen.getByTestId("obra-form"));

    expect(await screen.findByTestId("error-fechaFin")).toHaveTextContent(
      "La fecha de fin debe ser igual o posterior a la fecha de inicio"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("guarda un cambio válido de presupuesto vía PATCH /api/obras/:id/presupuesto (AC-10)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      json: async () => ({ id: "obra-1", ...obraInicial, presupuestoInicial: 2000000 }),
    } as Response);

    render(<ObraForm mode="editar" obraId="obra-1" obraInicial={obraInicial} />);

    fireEvent.change(screen.getByLabelText("Presupuesto inicial (ARS)"), {
      target: { value: "2000000" },
    });
    fireEvent.submit(screen.getByTestId("presupuesto-form"));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/obras/obra-1/presupuesto",
        expect.objectContaining({ method: "PATCH" })
      )
    );

    const llamada = vi.mocked(fetch).mock.calls[0];
    const opciones = llamada[1] as RequestInit;
    const cuerpoEnviado = JSON.parse(opciones.body as string);
    expect(cuerpoEnviado).toEqual({ presupuestoInicial: 2000000 });
  });

  it.each(["0", "-100", "abc"])(
    "muestra error si el presupuesto editado es inválido: %s (AC-11)",
    async (valorInvalido) => {
      render(<ObraForm mode="editar" obraId="obra-1" obraInicial={obraInicial} />);

      fireEvent.change(screen.getByLabelText("Presupuesto inicial (ARS)"), {
        target: { value: valorInvalido },
      });
      fireEvent.submit(screen.getByTestId("presupuesto-form"));

      expect(await screen.findByTestId("error-presupuestoInicial")).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it("un envío inválido de datos de obra no bloquea guardar un presupuesto válido, y viceversa", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      json: async () => ({ id: "obra-1", ...obraInicial, presupuestoInicial: 2000000 }),
    } as Response);

    render(<ObraForm mode="editar" obraId="obra-1" obraInicial={obraInicial} />);

    // Dejar el nombre vacío rompe el form de obra, pero no debe afectar al de presupuesto:
    // son dos <form> independientes, cada uno con su propio estado de errores.
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "" } });
    fireEvent.submit(screen.getByTestId("obra-form"));

    expect(await screen.findByTestId("error-nombre")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Presupuesto inicial (ARS)"), {
      target: { value: "2000000" },
    });
    fireEvent.submit(screen.getByTestId("presupuesto-form"));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/obras/obra-1/presupuesto",
        expect.objectContaining({ method: "PATCH" })
      )
    );
    // El error de la sección de obra sigue ahí — el submit de presupuesto no lo limpió.
    expect(screen.getByTestId("error-nombre")).toBeInTheDocument();
  });

  it("el layout en modo editar tampoco depende de anchos fijos mayores a 320px (NFR-01)", () => {
    render(<ObraForm mode="editar" obraId="obra-1" obraInicial={obraInicial} />);

    const formularioObra = screen.getByTestId("obra-form");
    const formularioPresupuesto = screen.getByTestId("presupuesto-form");

    for (const formulario of [formularioObra, formularioPresupuesto]) {
      expect(formulario.style.width).toBe("100%");
      expect(formulario.style.boxSizing).toBe("border-box");

      const inputs = formulario.querySelectorAll("input");
      expect(inputs.length).toBeGreaterThan(0);

      inputs.forEach((input) => {
        expect(input.style.width).toBe("100%");
        expect(input.style.boxSizing).toBe("border-box");
        expect(/^\d+(\.\d+)?px$/.test(input.style.width)).toBe(false);
      });
    }
  });
});
