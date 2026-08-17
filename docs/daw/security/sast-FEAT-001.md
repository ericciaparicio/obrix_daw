# SAST FEAT-001: Registrar una obra

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Date | 2026-08-17 |
| Scope | Todo el código de FEAT-001 (Blocks 1-5) + auditoría de dependencias |

## Secrets (F-SAST-01)

- ✅ `.env` nunca se commiteó (`git log --all -- .env` vacío) y está en `.gitignore`.
- ✅ Sin patrones de API key/password/token/connection-string hardcodeados en `app/`, `lib/`,
  `components/`, `prisma/` (grep sobre `password|secret|api[_-]?key|token\s*[:=]`).
- ✅ `.env.example` sólo tiene un placeholder documentado, ningún valor real.

## Injection (F-SAST-02, F-SAST-03, F-SAST-05)

- ✅ Sin SQL/NoSQL crudo: toda la persistencia pasa por Prisma (`$queryRaw`/`$executeRaw`: 0
  ocurrencias). Todas las queries son parametrizadas por el ORM.
- ✅ Sin command injection: el único uso de `child_process` es `prisma/seed.test.ts` con un
  comando fijo (`pnpm exec prisma db push ...`), sin interpolar entrada de usuario.
- ✅ Sin path traversal: ningún endpoint construye rutas de archivo a partir de entrada de
  usuario (esta feature no toca el filesystem en absoluto).

## XSS y funciones inseguras (F-SAST-04, F-SAST-06)

- ✅ Sin `dangerouslySetInnerHTML`, sin `innerHTML`, sin `eval()`.
- ✅ React escapa todo el output por default; los formularios no renderizan HTML de usuario.

## Resto de categorías obligatorias (F-SAST-07 a F-SAST-12, F-SAST-14, F-SAST-15)

- ✅ SSRF (F-SAST-07): sin llamadas salientes a URLs derivadas de entrada de usuario.
- ✅ Debug mode (F-SAST-09): sin flags de debug; el único branch por `NODE_ENV` es el guard de
  producción de `getCurrentConstructorId()` (falla cerrado, no abre nada).
- ✅ Logging de datos sensibles (F-SAST-10): el único `console.*` en código no-test es
  `prisma/seed.ts:35`, que loguea el error de una corrida standalone del seed — sin datos
  sensibles (el constructor sembrado no tiene contraseña, ver PRD/ADR).
- N/A Unrestricted upload (F-SAST-11): esta feature no implementa carga de archivos (fuera de
  alcance por PRD maestro).
- ⚠️ CSRF (F-SAST-12): no hay protección CSRF explícita en los endpoints `POST`/`PATCH`. **No
  aplica todavía como vulnerabilidad real**: no existe sesión ni cookie de autenticación en este
  ticket (`getCurrentConstructorId()` es el placeholder documentado en
  `docs/daw/security/threat-FEAT-001.md`) — sin sesión que robar, no hay CSRF que explotar. Mismo
  riesgo aceptado que la falta de auth, misma condición de revisión: se resuelve cuando exista
  RF-07/RF-08.
- ✅ Validación de entrada incompleta (F-SAST-14): los 4 endpoints mutables validan con Zod
  (`obraBaseSchema`, `presupuestoSchema`/`presupuestoField`) antes de tocar la base.
- ✅ Error handling que filtra internals (F-SAST-15): las 4 rutas mapean errores conocidos
  (`ZodError`, `ObraYaExisteError`, `ObraNoEncontradaError`) a respuestas genéricas; cualquier
  otro error se re-lanza (`throw error`) sin serializar mensaje/stack de Prisma al cliente.

## Dependencias (F-SAST-13)

`pnpm audit` encontró **11 vulnerabilidades (2 Critical, 4 High, 5 Moderate)**, todas
transitivas de devDependencies (`vitest`/`vite`/`esbuild`/`postcss`) y de `sharp` (dependencia
opcional de `next`, no usada por esta feature). Corregidas:

- `vitest` `2.1.8` → `^3.2.6` (corrige las 2 Critical: RCE vía servidor API, lectura arbitraria
  de archivos vía servidor UI — ambas requieren el dev server de Vitest expuesto y accedido desde
  un sitio malicioso).
- Overrides en `pnpm-workspace.yaml`: `sharp >=0.35.0` (High — CVEs de libvips heredadas),
  `postcss >=8.5.23` (High — path traversal / XSS en su stringifier), `vite >=6.4.3` (High —
  bypass de `server.fs.deny` en Windows).
- `@types/node` `22.10.2` → `22.20.1` (no es una vulnerabilidad; resuelve un warning de peer
  dependency que dejó `vite@8` sin tipos compatibles tras el bump de arriba).

Resultado tras la corrección: `pnpm audit` → **1 Moderate** restante (`esbuild`: el dev server de
esbuild permite que cualquier sitio web le mande requests — sólo explotable con el dev server de
Vite/Vitest corriendo y expuesto, nunca en el build de producción ni en CI). Moderate y no fixeable
sin un bump mayor de la cadena `vite→vitest`, así que se documenta como supresión formal:

**Supresión (F-SAST-18, 7 campos):**
| Campo | Valor |
|---|---|
| Archivo/paquete | `esbuild` (transitivo vía `vite`, dependencia de `vitest`, sólo dev) |
| Categoría | F-SAST-13 (CVE en dependencia), Moderate |
| Disposición | Aceptado |
| Reviewer | Usuario del proyecto (vía esta sesión de CODE, FEAT-001) |
| Fecha | 2026-08-17 |
| Justificación | Sólo explotable con el dev server de esbuild/Vite expuesto a la red y accedido por un sitio malicioso mientras corre; nunca se ejecuta en el build de producción (`pnpm build`/`next start`) ni en el pipeline de CI sin un dev server activo. |
| Control compensatorio / revisión | Revisar en 6 meses o antes si `vite`/`vitest` publican un patch que lo resuelva sin requerir un bump mayor; no exponer el dev server (`next dev`, `vitest`) a una red no confiable. |

Se re-corrió `pnpm test`, `tsc --noEmit` y `pnpm build` después de los bumps: 66/66 tests, 0
errores de tipos, build exitoso.

## Suppressions

1 (documentada arriba — `esbuild`, Moderate, dev-only).

---

Total: 15 categorías revisadas limpias, 1 supresión documentada (Moderate, dev-only), 0
Critical/High abiertos.
Result: **PASSED**
