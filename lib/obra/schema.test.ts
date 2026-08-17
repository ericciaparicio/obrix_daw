import { describe, it, expect } from "vitest";
import { crearObraSchema } from "./schema";

const datosValidos = {
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

describe("crearObraSchema", () => {
  describe("happy path", () => {
    it("should accept complete and valid data", () => {
      const result = crearObraSchema.safeParse(datosValidos);

      expect(result.success).toBe(true);
    });

    it("should accept data without fechaFin (optional field)", () => {
      const { fechaFin, ...sinFechaFin } = datosValidos;

      const result = crearObraSchema.safeParse(sinFechaFin);

      expect(result.success).toBe(true);
    });
  });

  describe("required fields — AC-02", () => {
    const camposObligatorios = [
      "nombre",
      "pais",
      "provincia",
      "localidad",
      "direccion",
      "latitud",
      "longitud",
      "fechaInicio",
    ] as const;

    it.each(camposObligatorios)(
      "should reject when %s is missing",
      (campo) => {
        const { [campo]: _omitido, ...datosIncompletos } = datosValidos;

        const result = crearObraSchema.safeParse(datosIncompletos);

        expect(result.success).toBe(false);
        if (!result.success) {
          const rutas = result.error.issues.map((issue) => issue.path.join("."));
          expect(rutas).toContain(campo);
        }
      }
    );

    it("should reject when a required text field is an empty string", () => {
      const result = crearObraSchema.safeParse({
        ...datosValidos,
        nombre: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("fecha fin anterior a fecha inicio — AC-03", () => {
    it("should reject when fechaFin is before fechaInicio", () => {
      const result = crearObraSchema.safeParse({
        ...datosValidos,
        fechaInicio: "2026-06-01",
        fechaFin: "2026-01-01",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const rutas = result.error.issues.map((issue) => issue.path.join("."));
        expect(rutas).toContain("fechaFin");
      }
    });

    it("should accept when fechaFin equals fechaInicio", () => {
      const result = crearObraSchema.safeParse({
        ...datosValidos,
        fechaInicio: "2026-06-01",
        fechaFin: "2026-06-01",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("presupuestoInicial — AC-06", () => {
    it("should reject presupuestoInicial equal to zero", () => {
      const result = crearObraSchema.safeParse({
        ...datosValidos,
        presupuestoInicial: 0,
      });

      expect(result.success).toBe(false);
    });

    it("should reject a negative presupuestoInicial", () => {
      const result = crearObraSchema.safeParse({
        ...datosValidos,
        presupuestoInicial: -500,
      });

      expect(result.success).toBe(false);
    });

    it("should reject a non-integer presupuestoInicial", () => {
      const result = crearObraSchema.safeParse({
        ...datosValidos,
        presupuestoInicial: 1000.5,
      });

      expect(result.success).toBe(false);
    });

    it("should reject a non-numeric presupuestoInicial", () => {
      const result = crearObraSchema.safeParse({
        ...datosValidos,
        presupuestoInicial: "1000",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("collects all field errors — no fail-fast", () => {
    it("should report every invalid field in a single error, not just the first", () => {
      const result = crearObraSchema.safeParse({
        ...datosValidos,
        nombre: "",
        latitud: 999,
        presupuestoInicial: -1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const rutas = result.error.issues.map((issue) => issue.path.join("."));
        expect(rutas).toContain("nombre");
        expect(rutas).toContain("latitud");
        expect(rutas).toContain("presupuestoInicial");
      }
    });
  });
});
