// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import EditarObraPage from "./page";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const obraActual = {
  id: "obra-1",
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

beforeEach(() => {
  pushMock.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

// See the same note in ObraForm.test.tsx / app/obra/page.test.tsx: `test.globals` is off, so
// RTL's auto-cleanup needs to be registered explicitly.
afterEach(cleanup);

describe("EditarObraPage (/obra/editar)", () => {
  it("carga el formulario de edición precargado con los datos actuales de la obra", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => obraActual,
    } as Response);

    render(<EditarObraPage />);

    expect(await screen.findByLabelText("Nombre")).toHaveValue(obraActual.nombre);
    expect(screen.getByLabelText("País")).toHaveValue(obraActual.pais);
    expect(screen.getByLabelText("Provincia")).toHaveValue(obraActual.provincia);
    expect(screen.getByLabelText("Localidad")).toHaveValue(obraActual.localidad);
    expect(screen.getByLabelText("Dirección")).toHaveValue(obraActual.direccion);
    expect(screen.getByLabelText("Latitud")).toHaveValue(String(obraActual.latitud));
    expect(screen.getByLabelText("Longitud")).toHaveValue(String(obraActual.longitud));
    expect(screen.getByLabelText("Fecha de inicio")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("Fecha de fin (opcional)")).toHaveValue("2026-12-31");
    expect(screen.getByLabelText("Presupuesto inicial (ARS)")).toHaveValue(
      String(obraActual.presupuestoInicial)
    );

    expect(fetch).toHaveBeenCalledWith("/api/obras/actual");
  });

  it("un 404 de GET /api/obras/actual muestra un mensaje general y redirige a /obra", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "sin_obra" }),
    } as Response);

    render(<EditarObraPage />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/obra"));
  });
});
