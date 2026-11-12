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
