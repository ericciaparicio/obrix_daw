# Threat Model FEAT-001: Registrar una obra

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Spec | docs/daw/specs/spec-FEAT-001.md |
| Date | 2026-08-17 |

## Attack surfaces identified

1. `POST /api/obras` — crea obra + presupuesto inicial (Block 2)
2. `GET /api/obras/actual` — lee la obra del constructor actual (Block 3)
3. `PATCH /api/obras/:id` — edita datos de la obra (Block 4)
4. `PATCH /api/obras/:id/presupuesto` — edita el presupuesto inicial (Block 4)
5. `lib/obra/service.ts` — lógica de negocio (Blocks 2, 4)
6. `lib/auth/current-constructor.ts` — placeholder de identidad (Block 1)
7. `prisma/seed.ts` — crea el `Constructor` fijo (Block 1)

## Trust boundaries

- **Browser (no confiable) → API routes de Next.js (confiable):** cruza en cada uno de los 4
  endpoints listados arriba. Es el único boundary real de este ticket.
- **API routes / servicio → PostgreSQL vía Prisma:** ambos lados confiables; Prisma parametriza
  las queries, sin SQL armado por concatenación.
- No hay integración con servicios externos en este ticket.

## Sensitive data classification (F-TM-05)

| Dato | Clasificación |
|---|---|
| `Constructor.email`, `nombre`, `apellido`, `celular` | PII |
| `Obra.direccion`, `latitud`, `longitud` | PII (ubicación física de una vivienda) |
| `Obra.presupuestoInicial` | Financiero |

No hay campo de credenciales en este ticket: `Constructor.password` se sacó explícitamente del
modelo (ver spec, Block 1) porque ningún código de FEAT-001 lo hashea ni lo usa — se agrega recién
con el ticket de autenticación real.

## STRIDE por componente

### API routes (1–4)

| Categoría | Análisis |
|---|---|
| Spoofing | 🟠 **HIGH.** No hay verificación de identidad: `getCurrentConstructorId()` resuelve siempre al mismo constructor fijo, sin importar quién llama. Cualquier cliente que le pegue a estos endpoints actúa como "el" constructor. |
| Tampering | 🟢 LOW. Body validado con Zod; Prisma parametriza — sin superficie de inyección. Sin auth, cualquiera puede tampering de la única obra existente, pero eso es consecuencia de Spoofing, no un vector propio. |
| Repudiation | 🟢 LOW. No hay logging de "quién" hizo el cambio (no hay "quién" que registrar todavía). Aceptable mientras no haya exposición real; se revisa junto con la auth real. |
| Information Disclosure | 🟠 **HIGH.** `GET /api/obras/actual` expone datos financieros y de ubicación sin ningún control de acceso. |
| Denial of Service | 🟡 MEDIUM. Sin rate limiting en `POST`/`PATCH`. Mitigado por no estar expuesto en producción (ver mitigación abajo). |
| Elevation of Privilege | N/A — no existe un modelo de privilegios todavía; se reduce a Spoofing. |

### `lib/auth/current-constructor.ts`

Es la raíz de los riesgos de Spoofing/Information Disclosure de arriba — un placeholder consciente,
no un descuido.

### `prisma/seed.ts`

| Categoría | Análisis |
|---|---|
| Tampering / Information Disclosure | 🟢 LOW. Sin `password`, no hay credencial que pueda terminar en texto plano. Datos de contacto (email, nombre, apellido, celular) del constructor fijo — dato de desarrollo, no de un usuario real. |

## Riesgos y mitigaciones

- 🟠 **HIGH — Spoofing + Information Disclosure: ningún endpoint verifica identidad.**
  Mitigación (folded into el spec, Block 1): `getCurrentConstructorId()` lanza un error al
  arrancar si `NODE_ENV === "production"`, impidiendo desplegar esta feature a producción antes de
  que exista autenticación real. Test: `lib/auth/current-constructor.test.ts`.

  Adicionalmente, **riesgo aceptado** para el uso en desarrollo/staging interno (F-TM-04):
  - Quién lo acepta: el usuario del proyecto, en esta sesión de PLAN (decisión "Solo obra, con
    auth simulada temporalmente" tomada en DEFINE, y confirmada de nuevo en este PLAN).
  - Justificación: implementar auth real (RF-07/RF-08) es un ticket propio; bloquear FEAT-001
    hasta que exista retrasaría sin necesidad la primera feature funcional de la app, y el guard
    de producción evita la exposición real.
  - Condición de revisión: este riesgo se cierra en cuanto el ticket de RF-07/RF-08 (login real)
    se implemente y reemplace `getCurrentConstructorId()`; hasta entonces, la app no se despliega
    a ningún ambiente accesible fuera de desarrollo local.

- 🟡 **MEDIUM — DoS: sin rate limiting.**
  Riesgo aceptado, misma condición de revisión que el punto anterior (no hay exposición real
  mientras el guard de producción esté activo).

- 🟢 **LOW — Repudiation: sin logging de autoría.**
  Riesgo aceptado; se resuelve naturalmente cuando la auth real aporte un `constructorId` real por
  request para loguear.

## Encryption (F-TM-07)

- **En tránsito:** `.env.example` documenta que `DATABASE_URL` debe usar `sslmode=require` cuando
  la base no es `localhost`.
- **En reposo:** depende de la infraestructura de PostgreSQL (disco encriptado del proveedor
  gestionado) — fuera del alcance de código de este ticket; se documenta como dependencia, no como
  tarea de este spec.

---

Risks: C:0 H:2 (mitigados) M:1 (aceptado) L:2 (aceptados)
Result: **PASSED** — los 2 riesgos HIGH tienen mitigación concreta doblada en el spec (Block 1) más
riesgo residual formalmente aceptado con sus 3 campos (F-TM-04); MEDIUM y LOW quedan como riesgo
aceptado bajo la misma condición de revisión.
