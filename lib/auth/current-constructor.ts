/**
 * Placeholder de identidad para FEAT-001 (sin auth real todavía).
 *
 * Única función que conoce "quién es el constructor actual". El id se lee de una constante
 * (no hardcodeado inline en cada call site) para que reemplazar este placeholder por una lectura
 * de sesión real (RF-07/RF-08) sea un cambio de un solo archivo.
 *
 * Mitigación de threat model (docs/daw/security/threat-FEAT-001.md, riesgo HIGH de
 * Spoofing/Information Disclosure): lanza un error si `NODE_ENV === "production"`, para que esta
 * feature sin auth real no se pueda desplegar a producción por accidente.
 */

export const SEEDED_CONSTRUCTOR_EMAIL = "constructor-demo@obrix.local";
export const SEEDED_CONSTRUCTOR_ID = "seed-constructor-fixed-id";

export function getCurrentConstructorId(): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "getCurrentConstructorId() es un placeholder de auth sin verificación real de identidad " +
        "y no puede usarse con NODE_ENV=production. Reemplazalo por una lectura de sesión real " +
        "(RF-07/RF-08) antes de desplegar."
    );
  }

  return SEEDED_CONSTRUCTOR_ID;
}
