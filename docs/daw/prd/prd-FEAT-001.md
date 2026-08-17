# PRD FEAT-001: Registrar una obra

| Field | Value |
|-------|-------|
| Ticket | FEAT-001 |
| Tracker | none |
| Date | 2026-08-17 |
| PRD loops | 2 |

## Context and Problem

Obrix centraliza la información financiera de una obra en construcción. Antes de poder registrar
presupuesto o gastos, el sistema necesita un registro de la obra en sí: sus datos identificatorios,
su ubicación y su presupuesto inicial.

Esta es la primera feature funcional de la app. El sistema de autenticación real (alta de
constructor y login, RF-07/RF-08 del PRD maestro) todavía no está implementado, por lo que este
ticket usa un constructor fijo (seed) en base de datos para poder modelar correctamente la relación
"una obra por constructor" desde el inicio, sin necesitar login real todavía.

## Goals

Permitir que un constructor registre los datos de su obra y su presupuesto inicial, y pueda editar
ambos luego, sentando la base de datos sobre la que se construirán el registro de gastos y el
reporte financiero (tickets futuros).

## Functional Requirements

- FR-01: El sistema debe permitir registrar una obra con los campos nombre, país, provincia,
  localidad, dirección, latitud y longitud (numéricas, ingreso manual) y fecha de inicio, todos
  obligatorios; y fecha de fin, opcional.
- FR-02: El sistema debe validar que, cuando se informa fecha de fin, esta sea igual o posterior a
  la fecha de inicio.
- FR-03: El sistema debe impedir que un constructor registre más de una obra.
- FR-04: El sistema debe permitir registrar el presupuesto inicial de una obra ya creada, como
  monto entero en pesos (ARS).
- FR-05: El sistema debe permitir editar los datos de una obra ya registrada.
- FR-06: El sistema debe permitir editar el presupuesto inicial ya registrado.

## Non-Functional Requirements

- NFR-01: Los formularios de alta y edición de obra deben ser utilizables sin scroll horizontal ni
  elementos superpuestos en pantallas desde 320px de ancho.
- NFR-02: Los montos de presupuesto deben almacenarse y procesarse como enteros (sin decimales),
  para evitar errores de redondeo de punto flotante.

## Acceptance Criteria

- AC-01 (FR-01): WHEN el constructor envía los datos de la obra con nombre, país, provincia,
  localidad, dirección, latitud, longitud y fecha de inicio completos y válidos (y fecha de fin
  ausente o válida), THE system SHALL crear la obra y dejarla disponible para asociarle
  presupuesto.
- AC-02 (FR-01): IF falta algún campo obligatorio de la obra (nombre, país, provincia, localidad,
  dirección, latitud, longitud o fecha de inicio), THEN THE system SHALL rechazar el registro y
  mostrar un mensaje de error indicando el campo faltante.
- AC-03 (FR-02): IF la fecha de fin informada es anterior a la fecha de inicio, THEN THE system
  SHALL rechazar el registro y mostrar un mensaje de error.
- AC-04 (FR-03): IF el constructor ya tiene una obra registrada, THEN THE system SHALL rechazar el
  registro de una segunda obra y mostrar un mensaje de error indicando que solo se permite una obra
  por constructor.
- AC-05 (FR-04): WHEN el constructor registra un presupuesto inicial con un monto entero positivo
  válido para una obra existente, THE system SHALL asociar el presupuesto a esa obra.
- AC-06 (FR-04): IF el monto del presupuesto inicial es cero, negativo, no numérico o no entero,
  THEN THE system SHALL rechazar el registro y mostrar un mensaje de error.
- AC-07 (FR-05): WHEN el constructor edita un dato de la obra ya registrada con un valor válido, THE
  system SHALL persistir el cambio.
- AC-08 (FR-05): IF el constructor edita la obra dejando vacío un campo obligatorio, THEN THE system
  SHALL rechazar la edición y mostrar un mensaje de error.
- AC-09 (FR-02, FR-05): IF al editar la obra la fecha de fin queda anterior a la fecha de inicio,
  THEN THE system SHALL rechazar la edición y mostrar un mensaje de error.
- AC-10 (FR-06): WHEN el constructor edita el presupuesto inicial con un monto entero positivo
  válido, THE system SHALL persistir el cambio.
- AC-11 (FR-06): IF el constructor edita el presupuesto inicial a un monto cero, negativo, no
  numérico o no entero, THEN THE system SHALL rechazar la edición y mostrar un mensaje de error.

## Out of Scope

- Autenticación real (RF-07, RF-08 del PRD maestro): login, registro de constructor con
  credenciales propias, cierre de sesión. Este ticket usa un constructor fijo precargado (seed).
- Registro, edición, eliminación e historial de gastos (RF-05, RF-06, RF-10 a RF-13 del PRD
  maestro).
- Reporte financiero (RF-06 del PRD maestro).
- Eliminar una obra ya registrada.
- Selección de ubicación en mapa o geocoding: país, provincia y localidad son texto libre; latitud
  y longitud se cargan manualmente, sin mapa.
- Catálogo de países/provincias/localidades.
- Adjuntar comprobantes o facturas.
- Múltiples monedas (todo se registra en ARS).
- Recuperación/restablecimiento de contraseña.
- Versionado histórico del presupuesto o del reporte financiero.

## Risks and Mitigations

- Riesgo: al no existir autenticación real todavía, la regla "una obra por constructor" se aplica
  contra un único constructor fijo (seed), por lo que no hay control de acceso real (401/403) en
  este ticket. → Mitigación: no exponer esta feature en producción hasta que el ticket de
  autenticación (RF-07/RF-08) esté implementado; queda documentado como limitación conocida y no
  como brecha de seguridad no identificada.
- Riesgo: la carga manual de latitud/longitud es propensa a errores de tipeo, al no haber
  verificación visual en mapa. → Mitigación: aceptado para este ticket; una mejora futura podría
  agregar una vista de mapa de solo lectura para confirmar el punto cargado.

## Dependencies

- Base de datos PostgreSQL con Prisma (`db push`, sin migraciones) para persistir Obra (con su
  presupuesto inicial como campo propio, sin tabla separada) y Constructor.
- Un registro fijo de Constructor (seed) debe existir en base de datos para que la obra pueda
  asociarse a él.
- No depende de RF-07/RF-08 (autenticación) para completarse este ticket, pero sí para que la
  feature sea utilizable de forma segura en producción (ver Riesgos).
