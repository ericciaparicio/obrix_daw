// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ObraPage from "./page";

const obraDeEjemplo = {
  id: "obra-1",
  nombre: "Torre Norte",
  pais: "Argentina",
  provincia: "Buenos Aires",
  localidad: "La Plata",
  direccion: "Calle 7 123",
  latitud: -34.9214,
  longitud: -57.9544,
  fechaInicio: "2026-01-01",
  fechaFin: "2026-12-31",
  presupuestoInicial: 1000000,
};

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

// See the same note in ObraForm.test.tsx: `test.globals` is off, so RTL's auto-cleanup needs to
// be registered explicitly.
afterEach(cleanup);

describe("ObraPage (landing /obra)", () => {
  it("redirige a /obra/nueva cuando GET /api/obras/actual da 404", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "sin_obra" }),
    } as Response);

    render(<ObraPage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/obra/nueva"));
    expect(fetch).toHaveBeenCalledWith("/api/obras/actual");
  });

  it("muestra los datos de la obra cuando GET /api/obras/actual da 200", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => obraDeEjemplo,
    } as Response);

    render(<ObraPage />);

    expect(await screen.findByRole("heading", { name: "Torre Norte" })).toBeInTheDocument();
    expect(screen.getByText("Buenos Aires")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar obra" })).toHaveAttribute(
      "href",
      "/obra/editar"
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("muestra un mensaje de error cuando la carga de la obra falla", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({ error: "error_inesperado" }),
    } as Response);

    render(<ObraPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar la obra. Intentá de nuevo más tarde."
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
