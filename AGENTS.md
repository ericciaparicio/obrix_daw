# AGENTS.md — project context

> **DAW template.** Fill in the `[...]` with what is true of YOUR project and delete what does not
> apply. This file describes **the project**; **the process** is DAW's job (phases, gates, when to
> test, when to commit). Do not mix the two: process rules written here compete with the pipeline's.
>
> It is **tool-agnostic on purpose**: Claude Code reads it through the import in `CLAUDE.md`, Codex
> CLI, Copilot CLI, Cursor and OpenCode read it directly, and Gemini CLI gets it through
> `GEMINI.md`. The same file serves whichever tool you open the repo with — which is the point:
> porting the pipeline to another tool must not mean rewriting what your project is.

---

## Language

**Always respond in the language the user writes in.** Write every artifact you produce — PRDs,
specs, ADRs, reports, commit messages, status lines — in that same language, regardless of the
language these instructions are written in.

If this project has a fixed working language, state it here and use it instead:

> Working language: `[e.g. Spanish — write all artifacts in Spanish]`

---

## Stack

- Next.js 15 (App Router)
- PostgreSQL (local)
- Prisma ORM - sin archivos de migración, usar `prisma db push`
- Auth.js v5 (NextAuth) - sesiones con expiración a los 30 mins de inactividad
- Vitest
- pnpm

---

## Architecture conventions

- **Layer separation:** [e.g. the UI never talks to the database; always through a service]
- **Error handling:** [e.g. typed errors; never a silent catch]

---

## Code conventions

- [e.g. No `any`. If it is unavoidable, it comes with a comment explaining why.]
- [e.g. Pure functions wherever possible; side effects at the edges.]
- [e.g. Comments only when the *why* is not obvious from the code.]

---

## What NOT to do in this project

- No implementar carga de archivos ni comprobantes asociados a gastos.
- No convervar versiones históricas de reportes financieros; sólo existe el estado actual de la obra.
- No guardar contraseñas en texto plano; siempre hashear (bcrypt o argon2)

---

> ℹ️ **What does NOT belong in this file, because DAW provides it:** the order work happens in, when
> the spec gets written, when tests run, when to commit, what it takes to move between phases. All
> of that lives in `.daw/` and applies on its own.

<!-- BEGIN DAW (managed by DAW — do not edit by hand) -->
# DAW — Dilux Agentic Workflow

This repo uses **DAW**: an agent-driven development pipeline with the phases
`CLASSIFY → DEFINE → PLAN → CODE → VERIFY → RELEASE`.

Before answering, read `.daw/orchestrator.md` and run its Boot Sequence. It is a strict state
machine: it decides what you are allowed to do based on the phase recorded in `.daw-state.json`.

The project's own context — stack, architecture, domain — is elsewhere in this file. It lives here,
in `AGENTS.md`, and not in any one tool's file, on purpose: it is tool-agnostic and comes along
unchanged when the pipeline is ported to another agent.
<!-- END DAW -->
