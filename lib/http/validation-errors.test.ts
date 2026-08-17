import { describe, it, expect } from "vitest";
import { z } from "zod";
import { formatearErroresDeValidacion } from "./validation-errors";

describe("formatearErroresDeValidacion", () => {
  it("collects one message per field across multiple invalid fields", () => {
    const schema = z.object({ nombre: z.string().min(1), edad: z.number().positive() });
    const result = schema.safeParse({ nombre: "", edad: -1 });

    expect(result.success).toBe(false);
    if (result.success) return;

    const fields = formatearErroresDeValidacion(result.error);

    expect(Object.keys(fields).sort()).toEqual(["edad", "nombre"]);
  });

  it("keeps the first message when a field has more than one issue", () => {
    const schema = z.object({ email: z.string().min(5).email() });
    const result = schema.safeParse({ email: "a" });

    expect(result.success).toBe(false);
    if (result.success) return;

    const fields = formatearErroresDeValidacion(result.error);

    expect(Object.keys(fields)).toEqual(["email"]);
    expect(fields.email).toBe(result.error.issues[0].message);
  });
});
