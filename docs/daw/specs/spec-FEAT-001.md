# Spec FEAT-001: Registrar una obra

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| PRD | docs/daw/prd/prd-FEAT-001.md |
| Tier | FEATURE |
| Date | 2026-08-17 |
| Spec loops | 0 |

## Summary

Se scaffoldea el proyecto Next.js 15 (App Router, TypeScript) con Prisma sobre PostgreSQL, y se
implementa el alta y edición de una obra con su presupuesto inicial. Sin autenticación real todavía:
un `Constructor` fijo se precarga por seed y un único punto (`getCurrentConstructorId()`) resuelve
"quién es el constructor actual" — el ticket de auth (RF-07/RF-08) solo tendrá que reemplazar esa
función por una lectura de sesión real. Capas: UI (Server/Client Components) → API Routes REST →
capa de servicio (`lib/obra/service.ts`, valida con Zod) → Prisma. La UI nunca llama a Prisma
directamente.

## Coverage: PRD → blocks

| Requirement | Covered by |
|---|---|
| FR-01 | Block 2, Block 3 |
| FR-02 | Block 2, Block 3 |
| FR-03 | Block 1 (constraint `constructorId @unique`), Block 2 (chequeo de aplicación, AC-04) |
| FR-04 | Block 2, Block 3 |
| FR-05 | Block 4, Block 5 |
| FR-06 | Block 4, Block 5 |
| NFR-01 | Strategy: layout responsive con CSS grid/flex, sin anchos fijos, probado a 320px de viewport en los tests de componente de los Blocks 3 y 5 |
| NFR-02 | Strategy: `presupuestoInicial` tipado `Int` en Prisma (Postgres `integer`) y validado como entero en Zod — nunca `Float`/`Decimal` |

## Dependencies between blocks

Block 1 → Block 2 → Block 3 → Block 4 → Block 5 (secuencial: cada bloque depende del anterior;
Block 4 modifica el servicio creado en Block 2, Block 5 modifica el componente creado en Block 3).

## Block 1 — Scaffolding, esquema de datos y placeholder de auth

**Files**
- `package.json` (new) — proyecto Next.js 15 + TypeScript, scripts `dev`/`build`/`test`
- `tsconfig.json` (new)
- `next.config.ts` (new)
- `app/layout.tsx` (new) — root layout requerido por App Router para renderizar cualquier ruta
- `prisma/schema.prisma` (new) — modelos `Constructor` y `Obra`
- `prisma/seed.ts` (new) — crea el registro fijo de `Constructor`
- `lib/db/prisma.ts` (new) — singleton de `PrismaClient`
- `lib/auth/current-constructor.ts` (new) — `getCurrentConstructorId()`
- `vitest.config.ts` (new)
- `.env.example` (new) — `DATABASE_URL`
- `.gitignore` (modified) — agrega las entradas estándar de Node/Next.js que hoy faltan
  (`node_modules/`, `.next/`, `.env`, `.env*.local`), además de las ya existentes de DAW

**Logic**
Inicializa el proyecto y la base. `getCurrentConstructorId()` es la única función que conoce el id
del constructor fijo (leído de una constante, no hardcodeado inline en cada call site), para que
reemplazarla por lectura de sesión real sea un cambio de un solo archivo. Como ninguna ruta de este
ticket verifica identidad real, `getCurrentConstructorId()` lanza un error al arrancar si
`process.env.NODE_ENV === "production"` — mitigación del riesgo de spoofing/exposición sin auth
identificado en el threat model (`docs/daw/security/threat-FEAT-001.md`): impide desplegar esta
feature a producción por accidente antes de que exista autenticación real.
`.env.example` documenta que `DATABASE_URL` debe usar `sslmode=require` fuera de `localhost`.

**Data model**

```prisma
model Constructor {
  id        String   @id @default(cuid())
  email     String   @unique
  nombre    String
  apellido  String
  celular   String
  createdAt DateTime @default(now())
  obra      Obra?
}

model Obra {
  id                 String    @id @default(cuid())
  constructorId      String    @unique
  constructor        Constructor @relation(fields: [constructorId], references: [id])
  nombre             String
  pais               String
  provincia          String
  localidad          String
  direccion          String
  latitud            Float
  longitud           Float
  fechaInicio        DateTime
  fechaFin           DateTime?
  presupuestoInicial Int?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}
```

`constructorId @unique` en `Obra` enforcea "una obra por constructor" (FR-03) a nivel de base de
datos, además de la validación de aplicación en Block 2 (defensa en profundidad, no es una
duplicación redundante: la constraint de DB es la que protege contra una condición de carrera si
en el futuro hay dos requests concurrentes).

`Constructor` deliberadamente NO incluye un campo `password` en este ticket: ningún código de
FEAT-001 implementa login, y agregar una columna de contraseña sin código que la hashee es el tipo
de brecha que `AGENTS.md` prohíbe explícitamente ("nunca en texto plano"). El ticket de
autenticación real (RF-07/RF-08) la agrega cuando también agregue el código que la hashea — con
`prisma db push` (sin migraciones) agregarla después es trivial.

**Error handling**
N/A — este bloque no expone entrada de usuario.

**Required tests**
- [ ] `lib/auth/current-constructor.test.ts` — `getCurrentConstructorId()` devuelve el id del
  constructor sembrado por el seed
- [ ] `lib/auth/current-constructor.test.ts` — lanza un error si `NODE_ENV === "production"`
  (mitigación de spoofing/exposición sin auth)
- [ ] `prisma/seed.test.ts` — `prisma db push` aplica el esquema sin error contra una base
  Postgres local
- [ ] `prisma/seed.test.ts` — el seed es idempotente (correrlo dos veces no duplica el constructor)

**Completion criterion**
`pnpm build` compila sin error, `pnpm prisma db push` aplica el esquema, `pnpm prisma db seed`
crea exactamente un `Constructor`, y los 4 tests del bloque pasan.

---

## Block 2 — Crear obra (alta combinada obra + presupuesto inicial): validación, servicio y endpoint

**Files**
- `lib/obra/schema.ts` (new) — esquemas Zod
- `lib/obra/service.ts` (new) — `crearObra(constructorId, input)`
- `app/api/obras/route.ts` (new) — handler `POST`

**Logic**
`crearObra` valida con Zod, después revisa si el constructor ya tiene una obra (`findUnique` por
`constructorId`); si existe, error de negocio "ya tiene una obra registrada" (AC-04). Si no existe,
crea el registro `Obra` con `presupuestoInicial` en la misma escritura. El endpoint resuelve
`constructorId` con `getCurrentConstructorId()`, llama al servicio, y mapea:
- error de validación Zod → 400 con el detalle de campos
- error de negocio "ya tiene obra" → 409
- éxito → 201 con la obra creada

**API contract**
- Method + path: `POST /api/obras`
- Request body:
  ```json
  {
    "nombre": "string",
    "pais": "string",
    "provincia": "string",
    "localidad": "string",
    "direccion": "string",
    "latitud": "number",
    "longitud": "number",
    "fechaInicio": "string (ISO date)",
    "fechaFin": "string (ISO date) | null",
    "presupuestoInicial": "integer > 0"
  }
  ```
- Response 201: la obra creada (todos los campos + `id`)
- Response 400: `{ "error": "validation", "fields": { "<campo>": "<mensaje>" } }`
- Response 409: `{ "error": "obra_ya_existe" }`
- Auth: ninguna todavía (placeholder — ver Block 1). Documentado como riesgo aceptado en el
  threat model.

**Input validation**
- `nombre`, `pais`, `provincia`, `localidad`, `direccion`: string no vacío, máx 200 caracteres.
- `latitud`: number finito, rango [-90, 90].
- `longitud`: number finito, rango [-180, 180].
- `fechaInicio`: fecha ISO válida, obligatoria.
- `fechaFin`: fecha ISO válida u omitida/null; si está presente, `fechaFin >= fechaInicio`.
- `presupuestoInicial`: entero, > 0.

**Error handling**
Todo error de validación se agrega en una sola respuesta 400 (no falla-rápido en el primer campo),
para que el formulario pueda mostrar todos los errores juntos.

**Required tests**
- [ ] `lib/obra/service.test.ts` — crea la obra con datos válidos → AC-01
- [ ] `lib/obra/schema.test.ts` — rechaza si falta un campo obligatorio → AC-02
- [ ] `lib/obra/schema.test.ts` — rechaza si `fechaFin < fechaInicio` → AC-03
- [ ] `lib/obra/service.test.ts` — rechaza una segunda obra para el mismo constructor → AC-04
- [ ] `lib/obra/service.test.ts` — crea el presupuesto inicial junto con la obra con un monto
  válido → AC-05
- [ ] `lib/obra/schema.test.ts` — rechaza `presupuestoInicial` en 0, negativo o no entero → AC-06
- [ ] `app/api/obras/route.test.ts` — `POST /api/obras` devuelve 201/400/409 según corresponda,
  integrando el servicio real

**Completion criterion**
Los 7 tests del bloque pasan; `POST /api/obras` devuelve 201/400/409 según corresponda.

---

## Block 3 — UI: formulario de alta combinado

**Files**
- `components/obra/ObraForm.tsx` (new) — client component, modo `crear`, campos obra + presupuesto
- `app/obra/nueva/page.tsx` (new) — página que renderiza `ObraForm` en modo `crear`
- `app/api/obras/actual/route.ts` (new) — handler `GET`, obra del constructor actual
- `app/obra/page.tsx` (new) — landing: si `GET /api/obras/actual` da 404 → redirige a
  `/obra/nueva`; si da 200 → muestra el detalle de la obra con link a `/obra/editar`

**Logic**
`ObraForm` mantiene estado local, valida en el cliente con el mismo `crearObraSchema` de
`lib/obra/schema.ts` antes de enviar (feedback inmediato), y además confía en la respuesta 400 del
servidor como fuente de verdad (nunca confía solo en la validación cliente). Al recibir 201,
redirige a `/obra`.

**API contract**
- Method + path: `GET /api/obras/actual`
- Response 200: la obra del constructor actual
- Response 404: `{ "error": "sin_obra" }`
- Auth: ninguna todavía (mismo placeholder).

**Input validation**
Reusa `crearObraSchema` de `lib/obra/schema.ts` (Block 2) — sin duplicar reglas.

**Error handling**
Errores 400 del servidor se mapean a mensajes debajo de cada campo; un error 409 muestra un mensaje
general ("ya tenés una obra registrada") y redirige a `/obra`.

**Required tests**
- [ ] `components/obra/ObraForm.test.tsx` — el formulario muestra un error por cada campo
  obligatorio vacío al enviar → AC-02
- [ ] `components/obra/ObraForm.test.tsx` — el formulario muestra error si
  `fechaFin < fechaInicio` → AC-03
- [ ] `components/obra/ObraForm.test.tsx` — el formulario muestra error si el presupuesto es
  0/negativo/no numérico → AC-06
- [ ] `components/obra/ObraForm.test.tsx` — el envío válido llama a `POST /api/obras` y redirige
  a `/obra` → AC-01, AC-05
- [ ] `components/obra/ObraForm.test.tsx` — un 409 del servidor muestra el mensaje "ya tenés una
  obra registrada" y redirige a `/obra` → AC-04
- [ ] `app/obra/page.test.tsx` — redirige a `/obra/nueva` cuando `GET /api/obras/actual` da 404
- [ ] `components/obra/ObraForm.test.tsx` — el layout no genera scroll horizontal en un viewport
  de 320px → NFR-01

**Completion criterion**
Los 7 tests del bloque pasan; el flujo de alta es navegable de punta a punta en un browser real.

---

## Block 4 — Editar obra y presupuesto: servicio y endpoints

**Files**
- `lib/obra/service.ts` (modified) — agrega `actualizarObra(id, input)` y
  `actualizarPresupuesto(id, input)`
- `app/api/obras/[id]/route.ts` (new) — handler `PATCH`, campos de la obra
- `app/api/obras/[id]/presupuesto/route.ts` (new) — handler `PATCH`, sólo `presupuestoInicial`

**Logic**
`actualizarObra` revalida con el mismo `obraBaseSchema` (sin permitir campos obligatorios vacíos) y
hace `update` sólo de los campos de obra. `actualizarPresupuesto` revalida con
`presupuestoSchema` y actualiza únicamente `presupuestoInicial`. Ambos devuelven 404 si el `id` no
existe.

**API contract**
- `PATCH /api/obras/:id`
  - Request: subconjunto de los campos de obra (no incluye `presupuestoInicial`)
  - Response 200: la obra actualizada
  - Response 400: igual formato que Block 2
  - Response 404: `{ "error": "obra_no_encontrada" }`
- `PATCH /api/obras/:id/presupuesto`
  - Request: `{ "presupuestoInicial": "integer > 0" }`
  - Response 200: la obra actualizada
  - Response 400 / 404: igual formato que arriba
- Auth: ninguna todavía (mismo placeholder).

**Input validation**
Mismas reglas de Block 2 para los campos de obra y de presupuesto respectivamente, reusando
`lib/obra/schema.ts`.

**Error handling**
Igual estrategia que Block 2: todos los errores de validación juntos en una sola respuesta 400.

**Required tests**
- [ ] `lib/obra/service.test.ts` — edita un dato de la obra con valor válido y lo persiste → AC-07
- [ ] `lib/obra/service.test.ts` — rechaza editar dejando un campo obligatorio vacío → AC-08
- [ ] `lib/obra/service.test.ts` — rechaza editar si la fecha de fin queda antes que la fecha de
  inicio → AC-09
- [ ] `lib/obra/service.test.ts` — edita el presupuesto con un monto entero positivo válido y lo
  persiste → AC-10
- [ ] `lib/obra/service.test.ts` — rechaza editar el presupuesto a 0, negativo, no numérico o no
  entero → AC-11
- [ ] `app/api/obras/[id]/route.test.ts` — `PATCH /api/obras/:id` devuelve 200/400/404 según
  corresponda, integrando el servicio real
- [ ] `app/api/obras/[id]/presupuesto/route.test.ts` — `PATCH /api/obras/:id/presupuesto`
  devuelve 200/400/404 según corresponda, integrando el servicio real

**Completion criterion**
Los 7 tests del bloque pasan; ambos endpoints `PATCH` devuelven 200/400/404 según corresponda.

---

## Block 5 — UI: formulario de edición

**Files**
- `components/obra/ObraForm.tsx` (modified) — agrega modo `editar`: pre-carga valores, llama a
  `PATCH` en lugar de `POST`
- `app/obra/editar/page.tsx` (new) — obtiene la obra actual vía `GET /api/obras/actual` y renderiza
  `ObraForm` en modo `editar`

**Logic**
El modo `editar` de `ObraForm` separa el submit del presupuesto del submit de los demás campos de
la obra (dos botones de guardar, o autosave por sección) para poder llamar a los dos endpoints
`PATCH` distintos de Block 4 de forma independiente.

**Input validation**
Reusa `obraBaseSchema` y `presupuestoSchema` de `lib/obra/schema.ts` (Block 2) — sin duplicar
reglas.

**Error handling**
Igual que Block 3: 400 se mapea a campo, 404 muestra un mensaje general y redirige a `/obra`.

**Required tests**
- [ ] `app/obra/editar/page.test.tsx` — el formulario de edición carga precargado con los datos
  actuales de la obra
- [ ] `components/obra/ObraForm.test.tsx` — guardar un cambio válido en los datos de la obra lo
  persiste → AC-07
- [ ] `components/obra/ObraForm.test.tsx` — muestra error si se deja vacío un campo obligatorio
  al editar → AC-08
- [ ] `components/obra/ObraForm.test.tsx` — muestra error si la fecha de fin editada queda antes
  que la fecha de inicio → AC-09
- [ ] `components/obra/ObraForm.test.tsx` — guardar un cambio válido de presupuesto lo persiste →
  AC-10
- [ ] `components/obra/ObraForm.test.tsx` — muestra error si el presupuesto editado es
  0/negativo/no numérico → AC-11
- [ ] `app/obra/editar/page.test.tsx` — un 404 de `GET /api/obras/actual` muestra un mensaje
  general y redirige a `/obra`
- [ ] `components/obra/ObraForm.test.tsx` — el layout no genera scroll horizontal en un viewport
  de 320px → NFR-01

**Completion criterion**
Los 8 tests del bloque pasan; el flujo de edición es navegable de punta a punta en un browser real.

---

## Final verification

- Las 11 ACs del PRD (AC-01 a AC-11) tienen al menos un test automatizado que las cubre.
- `pnpm test` corre en verde de punta a punta.
- Flujo manual: sin obra registrada → `/obra` redirige a `/obra/nueva` → alta con datos + presupuesto
  válidos → redirige a `/obra` → `/obra/editar` permite editar cada sección → los cambios se
  reflejan en `/obra`.
- Un segundo intento de alta (mismo constructor fijo) es rechazado con 409.
