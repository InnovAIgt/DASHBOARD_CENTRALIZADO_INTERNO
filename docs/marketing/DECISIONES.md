# Decisiones del Flujo de ventas v2

Cada decisión con su fecha, qué se decidió y por qué.

## D1 · 11/11/2026 · Reconstruir en vez de arreglar

**Decisión:** construir una versión nueva del Flujo de ventas en vez de corregir el
archivo actual (`flujo-ventas.html`, ~4,400 líneas).
**Por qué:** el ingeniero cambió la base del dashboard (solo calificados, 6 etapas,
tiempos). Quitar Redes sociales y Datared del archivo viejo obliga a tocar muchas partes.

## D2 · 11/11/2026 · Todo dentro del centralizado

**Decisión:** el Flujo de ventas vive completo en `DASHBOARD_CENTRALIZADO_INTERNO`,
sin depender de otro repositorio.
**Por qué:** un solo lugar para mantener, revisar y documentar.

## D3 · 11/11/2026 · Usar la API de reuniones de Prospekt IA en vivo, con la lógica de DashboardLeads

**Decisión:** consultar `https://prospektia.red.com.sv/api/metrics/reuniones` en vivo,
reutilizando la lógica de la "Vista 1: Dashboard General" de `InnovAIgt/DashboardLeads`.
**Por qué:** ya está probada, valida que las cifras cuadren y trae país, asesor, etapa,
calificación, fechas y unidades.
**Pendiente:** avisar a José Zeta (responsable de DashboardLeads).

## D4 · 11/11/2026 · La llave solo vive en el servidor

**Decisión:** el navegador llama a `/api/marketing/reuniones` (del mismo centralizado) y
esa función agrega `RED_API_KEY`. La variable **no** lleva prefijo `VITE_`.
**Por qué:** así la llave nunca aparece en la página ni en el repositorio.

## D5 · 11/11/2026 · Sin robot ni base de datos por ahora

**Decisión:** la v2 no usa el robot de carga ni Supabase para lo básico.
**Por qué:** la API en vivo alcanza para indicadores, embudo y filtros. Solo se agregaría
una base de datos si la API no trae las fechas por etapa (ver REQUISITOS R6).

## D6 · 11/11/2026 · El dashboard viejo no se borra hasta el final

**Decisión:** el Flujo de ventas actual sigue en el menú hasta que la v2 esté aprobada.
Ver [RETIRO_VERSION_ANTERIOR.md](RETIRO_VERSION_ANTERIOR.md).
**Por qué:** que nadie se quede sin dashboard mientras se construye.

## D7 · 11/11/2026 · Trabajo en rama aparte

**Decisión:** los cambios van en la rama `leads`; nada se sube
directo a `main`.
**Por qué:** poder revisar cada paso antes de publicarlo.

## D8 · 11/11/2026 · Qué datos del cliente llegan al navegador

**Decisión:** se conserva `client_name` porque el negocio necesita ver el nombre del
cliente; se elimina `client_phone` porque el dashboard no lo usa. El teléfono se quita en
el servidor (`server/marketingReuniones.js`) antes de responder, así nunca llega al
navegador.
**Por qué:** no enviar datos personales que la pantalla no necesita.
**Pendiente:** agregar login para proteger los datos de clientes.

## D9 · 11/11/2026 · Lógica de DashboardLeads, diseño propio

**Decisión:** la v2 usa la lógica de DashboardLeads con diseño visual propio basado en el
estilo del dashboard de Activaciones (sin modificar Activaciones).
**Cómo:** la lógica copiada (`utils/`, `types/`, `hooks/`, `context/`, `services/`) no se
toca; las pantallas copiadas de DashboardLeads se reemplazaron por pantallas propias
(`pantalla/`). Los estilos de Activaciones se copiaron a `flujo-ventas-v2.css` con nombres
propios (`fv2-`), encerrados para no afectar al resto del portal.
**Por qué:** que la v2 se vea como parte del portal (tema oscuro, mismos colores y
componentes que Activaciones) y que no se confunda con DashboardLeads.

## D10 · 11/11/2026 · Conversión de calificados corregida

**Decisión:** Conversión de calificados = ganados calificados ÷ calificados, porque algunos
ganados vienen de leads no calificados y la fórmula original los mezclaba.
**Cómo:** se calcula en `pantalla/datos.js` (`conversionCalificados`) sin modificar la lógica
copiada. La fórmula original (`qualifiedConversion` de `summarize`, que divide **todos** los
ganados entre los calificados) sigue en `utils/analytics.js`, pero la pantalla ya no la usa.
**Ejemplo (11/11/2026, sin filtros):** 67 ganados = 43 de leads calificados + 24 de no
calificados; 295 calificados. Antes: 67 ÷ 295 = 22.7 %. Ahora: 43 ÷ 295 = 14.6 %.
**Autorizó:** Keily García.

## D11 · 11/11/2026 · Informe detallado: pestaña, columnas y Excel

**Decisión:**
- El informe va en una **pestaña** ("Resumen" | "Informe detallado"), con los mismos filtros
  de arriba y sin tarjetas de resumen (ya están en los indicadores).
- La tabla muestra todos los campos útiles de la API, en 8 grupos. Cada grupo se puede ocultar.
- El Excel usa la **misma plantilla y método** que el de Activaciones (ExcelJS 4.4.0 desde el
  CDN, respaldo en CSV), replicados en `pantalla/excel.js`. Activaciones no lleva logo ni hoja
  de filtros en su Excel; la v2 agrega una hoja **"Filtros aplicados"** con el mismo estilo y
  no lleva hoja de resumen. Sin botón de PDF en esta sección.

**Campos de la API en cada grupo** (inventario del 11/11/2026, 1,693 leads):

| Grupo | Columnas (campo de la API) |
|---|---|
| Cliente | Cliente (`client_name`), Código (`client_id`), Rubro (`rubro`), Industria (etapa 2 `industria_sector` + `industria_otro`), Origen (`validator_source`) |
| Responsable | Ejecutivo (`asesor`), País (`pais`) |
| Calificación | Calificación (`tipo_lead`), Tipo de reunión, Interés de producto y ¿Requiere demo? (etapa 2), Tipo de llamada preferida (`preferred_tipo_llamada`) |
| Avance | Etapa (`opportunity_stage` / `_label`, con minibarra de 6), Estado (calculado por la lógica copiada), Días desde creación, Nivel de avance, Respuesta del cliente y Medio de seguimiento (etapa 5) |
| Fechas | Creación (`created_at`), Reunión (de la lógica copiada), Demo (etapa 3), Envío de propuesta (etapa 4), Seguimiento (etapa 5), Cierre (etapa 6 `fecha_cierre_real`), Próxima gestión con semáforo (de la lógica copiada) |
| Propuesta | ¿Tiene propuesta? (`has_propuesta`), Productos ofrecidos (etapa 2), Productos propuestos, Modelo de equipo, Cantidad de equipos, Plan en meses y Medio de envío (etapa 4), Rubro y Resumen de la propuesta (`propuesta_json`) |
| Resultado | Resultado de venta (`resultado_venta`), Categoría de cierre (`categoria_cierre`), Resultado y Razón de cierre (etapa 6), Motivo de pérdida (de la lógica copiada), Contacto exitoso, Motivo y Descripción de no contacto (etapa 6), Unidades (de la lógica, solo ganados) |
| Comentarios (oculto) | Retro del ejecutivo (`advisor_feedback`), Retro de reunión, demo, propuesta, seguimiento y cierre (etapas 2 a 6), Próximo paso (etapa 5), Comentario administrativo (etapa 6), Notas de la próxima gestión, Nota de seguimiento (`seguimiento_json`, que es texto libre, no JSON), Retro en formato anterior |

**Quedan fuera:** `client_phone` (nunca se muestra); `id` (interno); `country`,
`advisor_name` y `propuesta` (repiten `pais`, `asesor` y `has_propuesta`); `status` (se usa el
estado de la lógica); `start_time_display`, `end_time`, `end_time_display`,
`fecha_reunion_display` y `hora_reunion_display` (repiten la reunión); `tiene_retro` y
`minutos_hasta_retro` (internos); quién y cuándo agendó la próxima gestión (`user_name`,
`user_id`, `created_at`); y los campos casi vacíos (0 a 6 leads) de las etapas 2, 3, 4 y 5 y
de `propuesta_json`. Detalle en BITACORA, paso 4.1.

**Formato antiguo:** 26 leads traen algunos campos sueltos en la raíz de `stage_feedback_json`;
para los campos que existen en una sola etapa se usan como respaldo.
**Autorizó:** Keily García.

## D12 · 11/11/2026 · Regla de colores de los datos

**Decisión:** rojo `#c43c50` solo para lo crítico que necesita acción (seguimientos vencidos y
próxima gestión vencida); amarillo `#c59600` para atención (etapa con la mayor caída, % de paso
< 60 %, gestión para hoy, perdidos sin motivo); verde `#2f8f76` para lo que va bien (% de paso
≥ 75 %, ganados, gestión a tiempo); azul `#4f8fd8` / gris para información neutral
(calificados, % normales de 60 a 74 %, perdidos).
**Límites PROVISIONALES:** 60 % y 75 %, en la constante `LIMITES_PASO` de
`pantalla/datos.js`, hasta que el ingeniero los defina.
**Alcance:** solo los datos. El rojo de la marca del portal (botones activos, pestañas,
casillas, Aplicar, Excel, títulos pequeños, "Mostrando N leads", aviso de consulta) se queda, y
el error de conexión con Prospekt IA sigue en rojo.
**Autorizó:** Keily García.

## D13 · 11/11/2026 · Embudo con etapa real estimada (B)

**Decisión:** Embudo con etapa real estimada (B); pendiente pedir a Prospekt IA un campo con la
etapa en que se perdió el lead y las fechas de cada cambio de etapa.
**Por qué:** en la API los 1,098 leads perdidos aparecen en la etapa 6 (Cierre) sin importar
dónde se perdieron; con la etapa actual (`buildStageFunnel`) el embudo casi no mostraba caídas.
**Cómo (en `pantalla/datos.js`, `etapaAlcanzada`):** ganados → 6; abiertos → su etapa actual;
perdidos → la última etapa de la 2 a la 5 con datos registrados en `stage_feedback_json` (si
no hay, 1). Un lead que se saltó una etapa (p. ej. no requería demo) cuenta como que pasó por
ella. En pantalla, bajo el embudo: "Etapa estimada: los leads perdidos se ubican en la última
etapa con datos registrados por el vendedor".
**Perdidos por etapa estimada (11/11/2026):** 1 Asignación 391 · 2 Reunión 537 · 3 Demo 7 ·
4 Envío de propuesta 73 · 5 Seguimiento 90 = 1,098. La etapa 3 tiene datos en solo 27 leads
(la demo es opcional) y la 5 en 237.
**Mejor en cada etapa:** mayor % de paso de esa etapa a la siguiente (en Cierre, % que se
ganó), solo entre ejecutivos con al menos 5 leads que llegaron a ella; empate → más leads.
**Autorizó:** Keily García.

## D14 · 11/11/2026 · Pestañas, tarjetas de ejecutivos y límites del círculo

**Decisión:**
- Pestañas **Resumen · Ejecutivos · Informe detallado**. El Informe detallado (4.1) sigue
  funcionando como tercera pestaña.
- "Desempeño por ejecutivo", "Resultados por ejecutivo" y los dos "Resultados mensuales" salen
  del Resumen; su información pasa a las tarjetas de la pestaña Ejecutivos. El Detalle mensual
  por país se conserva: se abre desde la gráfica "Leads por mes" con el filtro de país actual.
- Filtros y pestañas fijos arriba mediante desplazamiento interno de la v2 (el portal tiene
  `overflow: hidden` y no se tocó `src/index.css`).
- **Color del círculo de conversión de calificados (PROVISIONAL hasta que el ingeniero defina la
  meta):** verde ≥ 20 % · azul 10–20 % · amarillo < 10 %, en la constante `LIMITES_CONVERSION`
  de `pantalla/datos.js`. Con los datos del 11/11/2026 el equipo convierte 13–15 % y los
  ejecutivos con 5 o más calificados van de 0 % a 37.5 %.
- "Su punto débil" (ventana del ejecutivo): la etapa 2 a 6 con menor % de entrada, solo entre
  etapas cuya etapa anterior tuvo al menos 5 leads (misma regla que "Mejor").
- Tarjetas: "N ventas" = ganados de calificados; orden por ventas, luego todos los ganados,
  luego calificados.
**Autorizó:** Keily García.

## D15 · 12/11/2026 · PDF con la herramienta y la plantilla de Activaciones

**Decisión:** la v2 descarga su PDF con la **misma herramienta compartida** del portal
(`public/assets/js/dashboard-pdf.js`, `dashboard-pdf-logo.js` y `public/assets/css/dashboard-pdf.css`),
sin copiarla ni modificarla, y con la **misma plantilla** de reporte que Activaciones (replicada
en `pantalla/pdf.js`). Solo cambian los módulos, la lógica y los datos.
**Cómo se carga en React sin tocar el portal:** al abrirse, la v2 agrega esos 3 archivos a la
página (una sola vez, con identificador) y llama a `window.DashboardPdf.openModulePicker`. Al
salir de la v2 se quita su ventana de módulos. Activaciones vive en su propio iframe con su propia
copia, así que no se ve afectado.
**Contenido:** 01 Resumen (2 páginas: países + indicadores + leads por mes; embudo por etapa),
02 Ejecutivos (todos, incluidos los de 0, con fila de equipo), 03 Informe detallado (vista
rápida y búsqueda de la pestaña Informe; 10 columnas en A4 horizontal: cliente, ejecutivo, país,
calificación, etapa, estado, creación, próxima gestión, unidades y resultado/motivo; tope de 300
filas con nota). Las 54 columnas completas quedan en el Excel.
**Colores:** en el contenido, rojo solo para lo vencido. El encabezado, la píldora y los acentos
rojos son la marca de la plantilla compartida (D12).
**Autorizó:** Keily García.
