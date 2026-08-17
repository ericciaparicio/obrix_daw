# ADR-001: Capas REST + servicio para mutaciones, sobre Server Actions

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Ticket | FEAT-001 |
| Status | Accepted |

## Context

FEAT-001 ("Registrar una obra") es la primera feature del proyecto. `AGENTS.md` declara el stack
(Next.js 15 App Router, Prisma, PostgreSQL) pero su sección "Architecture conventions" estaba vacía
— no había un patrón de capas establecido para mutaciones de datos. Había que decidirlo antes de
escribir la primera línea de código, porque el próximo feature (gastos, reporte financiero) va a
heredar lo que se elija acá.

## Options considered

### Option 1: Server Actions (`"use server"`)
- **Pros:** menos código boilerplate, progressive enhancement nativo de formularios, integra bien
  con Server/Client Components sin capa HTTP explícita.
- **Cons:** el contrato de entrada/salida queda implícito en la firma de la función, no en una ruta
  documentable; los códigos de estado HTTP (401/403 que pide RF-07 del PRD maestro) no son el
  mecanismo natural de comunicar errores.

### Option 2: API Routes (REST) bajo `app/api/`
- **Pros:** contrato explícito por endpoint (método + path + status codes), encaja directo con los
  criterios de aceptación del PRD maestro que ya hablan en términos HTTP (401/403 para RF-07), más
  fácil de consumir desde fuera de esta app si hiciera falta a futuro.
- **Cons:** más código explícito por endpoint que un Server Action equivalente.

## Decision

**API Routes (REST)**, con una capa de servicio intermedia (`lib/obra/service.ts`) que las rutas
llaman y que es la única que conoce Prisma. Elegido por el usuario en PLAN: los ACs de auth del PRD
maestro ya razonan en códigos HTTP, y un contrato de ruta explícito es más fácil de auditar en el
threat model que una función `"use server"`.

## Consequences

- Toda mutación futura (gastos, reporte financiero) sigue el mismo patrón: ruta en `app/api/` →
  servicio en `lib/<dominio>/service.ts` (valida con Zod) → Prisma. La UI nunca importa Prisma
  directamente.
- `AGENTS.md` sigue sin esta convención escrita explícitamente — este ADR es la referencia hasta
  que se traslade a la sección "Architecture conventions" del archivo.
- Afecta: `app/api/obras/**`, `lib/obra/service.ts`, `lib/obra/schema.ts` (spec-FEAT-001.md,
  Blocks 2–5).
