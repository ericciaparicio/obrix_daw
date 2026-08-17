# PRD-001: Obrix — Plataforma para la gestión integral de presupuesto y gastos de obra en construcción

## Contexto y Problema
Durante la construcción de una vivienda es habitual que el presupuesto inicial se vea afectado por la gran cantidad de gastos que surgen a lo largo de la obra. Muchas personas llevan ese control en planillas, lo que dificulta conocer cuánto dinero queda disponible, cuánto se ha gastado por tipo y si la obra continúa dentro del presupuesto previsto.

Obrix permitirá registrar y controlar el presupuesto de la obra, gestionar los gastos realizados y monitorear en tiempo real el estado financiero del proyecto, brindando información clara para tomar decisiones durante la construcción.

### Personas

- Constructor particular: Persona que está construyendo su vivienda, cuenta con un presupuesto limitado y necesita controlar los gastos para conocer el estado financiero de la obra.

## Objetivos
Centralizar la información financiera de la obra para permitir visualizar en tiempo real el avance del presupuesto, detectar desvíos y conocer en qué se está concentrando el gasto.

## Requerimientos Funcionales
- RF-01: El sistema debe permitir el registro de una única obra en construcción por constructor, indicando nombre, país, provincia, localidad, dirección, coordenadas y fecha de inicio (obligatorios), y fecha de fin (opcional).
- RF-02: El sistema debe permitir el registro del presupuesto inicial de la obra.
- RF-03: El sistema debe permitir editar los datos de la obra ya registrada.
- RF-04: El sistema debe permitir editar el presupuesto inicial ya registrado.
- RF-05: El sistema debe permitir el registro de los gastos según su tipo, expresados en pesos (ARS).
- RF-06: El sistema debe generar un reporte financiero con el presupuesto total, gastado, disponible, % consumido y gastado por tipo.
- RF-07: El sistema debe requerir autenticación (email + contraseña, con sesión).
- RF-08: El sistema debe permitir la registración de un constructor con email, contraseña, nombre, apellido y celular.
- RF-09: El sistema debe permitir al constructor cerrar sesión.
- RF-10: El sistema debe permitir editar cualquier campo de un gasto registrado.
- RF-11: El sistema debe permitir eliminar de forma permanente un gasto registrado.
- RF-12: El sistema debe permitir consultar el historial de gastos registrados de una obra.
- RF-13: El sistema debe incluir precargados los siguientes tipos de gasto: Administrativos, Dirección de Obra, Materiales, Mano de Obra y Otros.

## Requerimientos No Funcionales
- RNF-01: El reporte financiero debe visualizarse en menos de 3 segundos (p95).
- RNF-02: Las contraseñas deben almacenarse con hash seguro, nunca en texto plano.
- RNF-03: La sesión debe expirar tras 30 minutos de inactividad.
- RNF-04: La interfaz debe ser utilizable sin scroll horizontal ni elementos superpuestos en pantallas desde 320 px de ancho.

## Criterios de Aceptación
- AC-01 (RF-01): Dado un conjunto de datos válido de obra, con nombre, país, provincia, localidad, dirección, coordenadas y fecha de inicio completos (fecha de fin es opcional), cuando el constructor la registra, entonces la obra queda creada y disponible para asociarle un presupuesto y registrar gastos.
- AC-02 (RF-01): Dado un registro de obra con algún campo obligatorio faltante (nombre, país, provincia, localidad, dirección, coordenadas o fecha de inicio), cuando el constructor intenta registrarla, entonces el sistema lo rechaza y muestra un mensaje de error indicando el campo faltante.
- AC-03 (RF-01): Dado un constructor que ya tiene una obra registrada, cuando intenta registrar una segunda obra, entonces el sistema lo impide y muestra un mensaje de error indicando que solo se permite una obra por constructor.
- AC-04 (RF-02): Dado un presupuesto inicial válido, cuando el constructor lo registra para una obra, entonces el presupuesto queda asociado a dicha obra y disponible para calcular el presupuesto restante.
- AC-05 (RF-02): Dado un presupuesto con monto cero, negativo o no numérico, cuando el constructor intenta registrarlo, entonces el sistema lo rechaza y muestra un mensaje de error.
- AC-06 (RF-03): Dado un dato de la obra ya registrado, cuando el constructor lo edita con un valor válido, entonces el cambio queda persistido y se refleja en los datos de la obra y en el reporte financiero.
- AC-07 (RF-03): Dado un dato de la obra ya registrado, cuando el constructor intenta editarlo dejando vacío un campo obligatorio, entonces el sistema lo rechaza y muestra un mensaje de error.
- AC-08 (RF-04): Dado un presupuesto inicial ya registrado, cuando el constructor lo edita con un valor válido, entonces el cambio queda persistido y se refleja en el reporte financiero.
- AC-09 (RF-04): Dado un presupuesto inicial ya registrado, cuando el constructor intenta editarlo a un monto cero, negativo o no numérico, entonces el sistema lo rechaza y muestra un mensaje de error.
- AC-10 (RF-05): Dado un gasto válido asociado a una obra, cuando el constructor registra el gasto, entonces éste queda almacenado, asociado a la obra correspondiente y es considerado en el cálculo del presupuesto disponible y en los reportes financieros.
- AC-11 (RF-05): Dado un gasto con monto cero o negativo, cuando el constructor intenta registrarlo, entonces el sistema lo rechaza y muestra un mensaje de error indicando que el monto debe ser mayor a cero.
- AC-12 (RF-05): Dado un gasto sin tipo seleccionado, cuando el constructor intenta registrarlo, entonces el sistema lo rechaza y muestra un mensaje de error indicando que el tipo es obligatorio.
- AC-13 (RF-05): Dado un constructor que no tiene una obra creada, cuando intenta registrar un gasto, entonces el sistema lo impide y lo redirige a crear su obra primero.
- AC-14 (RF-05): Dado un gasto sin fecha, cuando el constructor intenta registrarlo, entonces el sistema lo rechaza y muestra un mensaje de error indicando que la fecha es obligatoria.
- AC-15 (RF-05): Dado un gasto con moneda distinta de ARS, cuando el constructor intenta registrarlo, entonces el sistema lo rechaza y muestra un mensaje de error indicando que la única moneda aceptada es pesos (ARS).
- AC-16 (RF-05, RF-06): Dado un gasto cuyo monto supera el saldo disponible de la obra, cuando el constructor lo registra, entonces el sistema lo almacena y el reporte muestra el saldo disponible en negativo.
- AC-17 (RF-06): Dada una obra con presupuesto y gastos registrados, cuando el constructor consulta el reporte financiero, entonces el sistema muestra el presupuesto total, el monto gastado, el saldo disponible, el porcentaje consumido y el detalle de gastos por tipo.
- AC-18 (RF-06): Dada una obra con presupuesto registrado pero sin gastos cargados, cuando el constructor consulta el reporte financiero, entonces el sistema muestra el presupuesto total, monto gastado en cero, saldo disponible igual al presupuesto total y porcentaje consumido en 0%.
- AC-19 (RF-07): Dado un usuario no autenticado, cuando intenta acceder a información de una obra, entonces el sistema responde HTTP 401 y no muestra ningún dato.
- AC-20 (RF-07): Dado un constructor A y otro constructor B autenticado, cuando B intenta ver una obra asociada a A, entonces responde HTTP 403 y no permite visualizar la información de dicha obra.
- AC-21 (RF-07): Dado un email o una contraseña incorrectos, cuando un usuario intenta iniciar sesión, entonces el sistema rechaza el acceso y muestra un mensaje de error.
- AC-22 (RF-08): Dados datos válidos de registro (email, contraseña, nombre, apellido y celular), cuando el constructor se registra, entonces la cuenta queda creada y el constructor puede iniciar sesión con esas credenciales.
- AC-23 (RF-08): Dado un email ya utilizado por otra cuenta, cuando un constructor intenta registrarse con ese email, entonces el sistema lo rechaza y muestra un mensaje de error indicando que el email ya está en uso.
- AC-24 (RF-08): Dado un registro con el email en formato inválido o con algún campo obligatorio vacío (nombre, apellido o celular), cuando el constructor intenta registrarse, entonces el sistema lo rechaza y muestra un mensaje de error.
- AC-25 (RF-09): Dado un constructor autenticado, cuando cierra sesión, entonces la sesión queda invalidada y un intento posterior de acceder a información de la obra responde HTTP 401.
- AC-26 (RF-10): Dado un gasto existente, cuando el constructor modifica alguno de sus datos, entonces los cambios quedan persistidos y el reporte financiero refleja los nuevos valores.
- AC-27 (RF-11): Dado un gasto existente, cuando el constructor lo elimina, entonces el registro se elimina de forma permanente, deja de aparecer en el historial y deja de impactar en el presupuesto y los reportes.
- AC-28 (RF-10, RF-11): Dado un constructor A y otro constructor B autenticado, cuando B intenta editar o eliminar un gasto asociado a una obra de A, entonces el sistema responde HTTP 403 y no permite la operación.
- AC-29 (RF-12): Dada una obra con gastos registrados, cuando el constructor consulta el historial, entonces el sistema muestra todos los gastos asociados ordenados cronológicamente, indicando su fecha, tipo y monto.
- AC-30 (RF-13): Dado un sistema recién instalado sin tipos de gasto creados manualmente, cuando el constructor accede al registro de gastos, entonces los tipos Administrativos, Dirección de Obra, Materiales, Mano de Obra y Otros están disponibles para seleccionar.

## Fuera de Alcance
- No se permitirá adjuntar facturas, ni otros comprobantes asociados a los gastos.
- El sistema no soportará múltiples monedas; todos los montos se registran en pesos (ARS).
- No incluye planificación de tareas de obra, proveedores, órdenes de compra, pagos, certificaciones, cronograma, ni comparación contra avance físico.
- El sistema no conservará versiones históricas de los reportes financieros; únicamente permitirá consultar la situación financiera actual de la obra.
- El sistema no enviará emails con información de la obra.
- No se implementará recuperación ni restablecimiento de contraseña ("olvidé mi contraseña").

## Riesgos y Dependencias
- Riesgo: El usuario no registra todos los gastos y los reportes financieros pierden confiabilidad. → mitigación: Mostrar indicadores de "última carga realizada" y destacar cuando existen períodos prolongados sin movimientos.
- Dependencia:
  - Disponibilidad de una infraestructura que garantice el almacenamiento seguro y persistente de la información de las obras y los gastos.
  - Disponibilidad de un servicio de autenticación para el registro e inicio de sesión de usuarios.
