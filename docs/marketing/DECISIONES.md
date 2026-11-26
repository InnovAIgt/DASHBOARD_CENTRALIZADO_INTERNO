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

## D16 · 12/11/2026 · Embudo por etapa rediseñado como "Recorrido de los leads"

**Decisión:** la sección "Embudo de ventas por etapa" de la pestaña Resumen se reemplaza por
**"Recorrido de los leads"**: 6 círculos (uno por etapa) unidos por una línea; sobre cada tramo,
"−X · Y % pasa"; debajo de cada etapa, una tarjeta con los leads que llegaron, el % del total,
cuántos esperan hoy ahí (en Cierre: "N ganados · M esperando aquí") y el "Mejor". Arriba, 3
pastillas: entraron, en camino (todos los abiertos hoy, etapas 1 a 6) y cerrados (ganados). El
mismo diseño, sin "Mejor" ni aviso, se usa en "Avance por etapa" de la ventana del ejecutivo, que
ahora ocupa todo el ancho ("Ventas por mes" va debajo).
**Por qué:** las tarjetas anteriores no comunicaban dónde se frena el embudo.
**Números:** no se cambió ningún cálculo. Todo sale de `embudoEtapas()` (etapa real estimada,
D13); la función nueva `recorridoLeads()` (`pantalla/datos.js`) solo los reorganiza. Los % se
muestran como entero redondeando lo que muestra la ventana de detalle (53.8 % → 54 %).
**Colores (mismos que la ventana de detalle, D12, sin rojo):** % de paso con `tonoPaso` /
`LIMITES_PASO`: verde ≥ 75 % · gris 60–74 % · amarillo < 60 %.
**Pocos datos:** si a la etapa de origen llegaron menos de 5 leads, el tramo va punteado, en gris
tenue y dice "−X · pocos datos".
**Dónde se frena:** el tramo con menor % de paso entre los que tienen al menos 5 leads en la etapa
de origen (más grueso y con halo amarillo; la etapa destino va en amarillo y aparece el aviso
"Atención: el recorrido se frena entre A y B"). La ventana de detalle de etapa recibe este mismo
resaltado (se le pasa el dato; su código no cambió). Antes la ventana resaltaba la etapa con
menor % de entrada sin mínimo de leads. En la ventana del ejecutivo, el tramo resaltado es su
punto débil (misma regla, D14).
**Mejor:** exactamente la regla actual de la ventana de detalle (D13): mayor % de paso a la
siguiente etapa, mínimo 5 leads, incluida Cierre (% que se ganó). Si nadie llega a 5 leads:
"Mejor: pocos datos". No se agregó la condición de "más de un ejecutivo", para que siempre
coincida con la ventana.
**Clic:** en el Resumen abre la ventana de detalle de etapa que ya existía, con los filtros
activos. En la ventana del ejecutivo, el clic sigue filtrando "Leads del ejecutivo" a los que
están hoy en esa etapa.
**Responsive:** por debajo de 900 px el recorrido pasa a vertical (sin desplazamiento horizontal).
**Pendiente:** la tabla del embudo del PDF (`pantalla/pdf.js`) todavía resalta con la regla
anterior.
**Autorizó:** Keily García.

## D17 · 12/11/2026 · Fichas de coaching por ejecutivo

**Decisión:** la pestaña Ejecutivos muestra una ficha de ancho completo por vendedor, con estado
(Necesita apoyo, Va bien o Pocos datos), indicadores, resultados comparados con el equipo,
avance por etapa y acciones de esta semana.

**Cálculos:**
- El equipo de referencia incluye Guatemala y El Salvador, sin filtrar por vendedor ni país, pero
  conserva el mismo período y tipo de lead elegidos en la pantalla.
- Citas cumplidas = leads que llegaron a Reunión ÷ leads que llegaron a Asignación. Propuestas
  enviadas = leads que llegaron a Envío de propuesta ÷ leads que llegaron a Asignación. Ganados =
  ganados calificados ÷ calificados recibidos.
- Los pasos comparan el porcentaje de paso del ejecutivo con el del equipo. No se comparan pasos
  con menos de 5 leads en su etapa de origen. El punto débil es el paso con la brecha negativa más
  grande; "Necesita apoyo" requiere una brecha de 10 puntos o más. Con menos de 5 calificados, el
  estado es "Pocos datos"; si no hay brecha negativa comparable, "Va bien".
- El ranking cuenta ganados calificados en el equipo; los empates comparten posición. Las acciones
  destacan seguimientos vencidos, la etapa con más leads esperando hoy (mínimo 3) y el punto débil
  frente al equipo (o "Mantener el ritmo").
- Clic en un paso filtra en el detalle los leads que llegaron a esa etapa, incluidos los que ya
  avanzaron, no solo los que siguen abiertos ahí. Las acciones filtrables llevan a los leads que
  requieren seguimiento.

**Alcance visual:** las fichas y sus estilos usan el prefijo `fv2-coach-`, dentro del contenedor
`.fv2`. Por debajo de 1,100 px los tres paneles se apilan; por debajo de 700 px los indicadores
se ordenan en una cuadrícula 2 × 2.

**Límites:** la ficha solo cambia la pestaña Ejecutivos del navegador y la ventana del ejecutivo
que abre. No cambia el PDF, su tabla de ejecutivos, el dashboard viejo, Supabase ni Activaciones.
La revisión visual final queda a cargo de Keily antes de publicar.

## D18 · 12/11/2026 · Retirar el dashboard anterior del menú

**Decisión:** la entrada única **"Flujo de ventas"** del menú MARKETING abre la v2. Se quita la
entrada del dashboard anterior y el nombre temporal "(prueba)". El archivo HTML viejo se conserva
en el repositorio como respaldo; no se borra en este cambio.

**Estado:** cambio preparado en una rama basada en `main` para que se integre por PR. Al momento de
prepararlo, el endpoint de producción respondió que `RED_API_KEY` no está configurada; por eso la
v2 puede abrir sin cargar leads hasta que la variable esté disponible y se redepliegue.

## D19 · 24/11/2026 · SLA y vistas de seguimiento por equipo

**Decisión:** cada lead abierto muestra el tiempo hábil en su etapa actual y un semáforo: SLA común
de 2 días hábiles; verde dentro del SLA, amarillo hasta 2 días hábiles de atraso y rojo con más de
2 días hábiles de atraso. Amarillo + rojo forman el total de etapas vencidas. El cumplimiento del
ejecutivo es etapas verdes ÷ etapas abiertas con una fecha disponible; no depende de que la venta
se cierre.

**Fechas:** usar el hito existente de la etapa (reunión, demo, envío de propuesta, seguimiento o
cierre). Si falta, usar la fecha de creación y marcar el resultado como aproximado. Mientras no
exista calendario de feriados por país, se cuentan días de lunes a viernes sin descontar feriados;
si no hay hito ni fecha de creación, mostrar "Sin fecha" y excluirlo del porcentaje. Los leads
cerrados no se cuentan como etapas activas vencidas.

**Vistas:** como el portal aún no tiene inicio de sesión real, la pestaña Ejecutivos incluye
selectores temporales de jefatura/equipo o vendedor, y de Guatemala, El Salvador o ambos. La
jefatura ve primero los rojos agrupados por vendedor, con vendedores ordenados por cantidad de
rojos, y puede desplegar las oportunidades de cada etapa y el coaching detallado. El vendedor ve
sus oportunidades ordenadas rojo → amarillo → verde. El SLA de etapa es independiente del
vencimiento de la próxima gestión; ambos se conservan.

**Filtros:** resumen, conteos, cumplimiento, listas y forecast respetan los filtros generales y el
equipo temporal seleccionado. Se conserva la barra de filtros actual sin cambios.

## D20 · 24/11/2026 · Panel comercial unificado

**Decisión:** la entrada predeterminada muestra un único **Panel completo** con los indicadores
generales del dashboard de Leads y, debajo, el seguimiento operativo del equipo: SLA, alertas,
recorrido por las seis etapas, forecast y coaching. El informe detallado permanece disponible como
consulta secundaria; no se separa el seguimiento en una pestaña aparte.

**Orden de lectura:** indicadores generales → SLA del equipo → rojos y seguimientos vencidos por
vendedor → recorrido con el mejor ejecutivo por etapa → forecast agrupado por etapa → coaching del
vendedor seleccionado → tendencia mensual y ranking. En el forecast, cada etapa presenta su total,
promedio de días y conteos por semáforo; sus leads se despliegan bajo demanda para mantener el panel
legible. La selección de jefatura/vendedor y país sigue siendo temporal mientras no exista login.

**Diseño:** conservar los colores y la barra de filtros existentes. Reorganizar tarjetas, títulos,
secciones y controles según la jerarquía más clara del dashboard de Leads. Los rojos SLA y los
seguimientos vencidos se distinguen porque representan reglas diferentes.

## D21 · 24/11/2026 · Forecast como vista independiente

**Decisión:** conservar el coaching, las alertas SLA y el recorrido por etapas en **Panel completo**.
Agregar una pestaña **Forecast** al mismo nivel que **Panel completo** y **Detalle de leads**, sin
duplicar allí el bloque de pipeline/forecast del equipo.

**Filtros y validación:** Forecast recibe los leads ya filtrados por País, Período, Ejecutivo y Tipo
de lead desde la barra superior. Mantiene los horizontes de 7, 15, 30 y 60 días y la validación
existente: lead abierto en Seguimiento, no excluido, señal de cierre en comentario y próxima gestión
entre hoy y el horizonte. Presenta resumen por casos, ejecutivos y unidades, la tabla de casos y el
desglose de oportunidades abiertas por etapa con tiempo promedio y SLA. El horizonte seleccionado
se comparte con el resumen de seguimiento del coaching.

## D22 · 24/11/2026 · Tendencia mensual y comparación regional

**Decisión:** en el Panel completo, presentar primero los indicadores y el análisis mensual; después,
la comparación regional y el ranking; al final, el seguimiento SLA y coaching. El embudo mensual se
muestra directamente bajo la gráfica, sin ocultarlo tras un selector interno.

**Datos y filtros:** la gráfica, el embudo y la comparación Guatemala/El Salvador reciben la misma
lista de leads filtrados por País, Período, Ejecutivo y Tipo de lead. El embudo genera automáticamente
el total y un grupo por cada mes con datos; la comparativa regional muestra leads, calificados,
ganados, unidades y conversión, con acceso al detalle por país. No se agrega el filtro "Month to day".

## D23 · 24/11/2026 · Quitar el aviso del recorrido

**Decisión:** retirar la tarjeta de alerta que describía dónde se frena el recorrido. Se conserva el
resaltado amarillo del tramo y las leyendas de conversión y SLA; el resto del recorrido no cambia.

## D24 · 24/11/2026 · Solo datos de la API

**Decisión:** retirar el fallback de datos de demostración. El panel solo muestra los leads recibidos
de Prospekt IA; ante una falla muestra el error y la opción de reintentar, sin sustituirlos por datos
ficticios.

## D25 · 26/11/2026 · Rediseño del Panel completo, Partes 0 y 1

**Decisión de Keily:** reorganizar el Panel completo sin cambiar cálculos ni reglas. Arriba quedan:

1. **6 números en una fila:** «Leads calificados» (con filtro Calificado) o «Total leads» (con Todos), Ganados,
   Conversión, Unidades vendidas, Unidades por cierre y **Cumplimiento SLA**. Cada uno lleva su desglose GT · SV
   (etiquetas de texto, sin banderas). Con el filtro Todos, la Conversión de calificados (D10) va como línea pequeña
   dentro de la tarjeta Conversión, no como 7.º número.
2. **Qué atender hoy:** etapas rojas (y cuántos ejecutivos), etapas recién vencidas y oportunidades de forecast.
3. **Recorrido de las 6 etapas**, que sube desde «Seguimiento de ventas y coaching». El título dice dónde se frenan más,
   la marca «Aquí se frenan más» va en la línea de ese paso y las líneas dicen «77 % pasa · 12 se quedan». En Cierre
   se oculta el plazo de 2 días y su semáforo (no aplica) mientras no haya leads abiertos medidos ahí.

**Cumplimiento SLA:** no es un cálculo nuevo; es el de `resumirSlaEtapas` (etapas a tiempo ÷ etapas abiertas con
fecha). Su color usa la misma escala que el % de paso entre etapas, pero con rojo abajo:

| Cumplimiento (% entero que se ve) | Color |
|---|---|
| 75 % o más | Verde |
| 60 a 74 % | Amarillo |
| Menos de 60 % | Rojo |

Los límites están en un solo lugar: `LIMITES_CUMPLIMIENTO_SLA` en
`src/modulos/marketing/flujo-ventas-v2/pantalla/datos.js`.

**Piezas nuevas:** `pantalla/piezas.jsx` y `pantalla/piezas.css` (prefijo `fv2n-`). Son aparte porque Canales de
marketing reutiliza `comunes.jsx` y `flujo-ventas-v2.css`; así esa pantalla no cambia.

## D26 · 26/11/2026 · Rediseño del Panel completo, Parte 2: tabla de ejecutivos

**Decisión de Keily:** juntar «Top 5 ejecutivos», las 4 tarjetas SLA, «Prioridad del equipo» y el coaching en una sola
**tabla de ejecutivos**, debajo del Recorrido, con dos vistas:

- **Atrasos (semáforo SLA)**, que se abre primero: un renglón por ejecutivo con Recibidos, Ganados, Conversión, Rojas,
  Amarillas, A tiempo, Cumple SLA y Seguimientos vencidos. Orden: más rojas, luego más amarillas, luego más
  seguimientos vencidos y luego nombre. El título dice quién tiene más etapas en rojo. Clic en el renglón: sus etapas en
  rojo, sus etapas recién vencidas y sus seguimientos vencidos (antes en «Prioridad del equipo») y el botón
  **«Ver coaching»**.
- **Resultados:** la tabla por asesor de siempre (agrupada por país), sin quitar columnas.

**Cifras:** en Atrasos, Recibidos = total de leads y Conversión = ganados ÷ total, las mismas de Resultados. Rojas,
amarillas, a tiempo y Cumple SLA salen de `evaluarSlaEtapa` / la misma cuenta de `resumirSlaEtapas`; Cumple SLA usa los
colores de D25. Seguimientos vencidos = `classifyFollowUps().overdue`, igual que «Prioridad del equipo». La ficha de
coaching sigue con su propia «conversión de calificados».

**«Ganados» = «Radicados»:** es exactamente la misma cifra (`isWon`, sumada con `summarize`). En pantalla ya dice
«Ganados» en todas partes; «Radicados» solo aparece como aclaración en notas y en el PDF («= "Radicados" en el
dashboard de leads»). Se usa «Ganados».

**Ver coaching:** abre en una ventana la ficha de coaching que ya existía. «Ver ficha completa» muestra la ficha
completa (antes, la vista «Ejecutivo»). Desde ahí, «Abrir detalle del ejecutivo» abre la ventana del ejecutivo de
siempre.

**Selector «Equipo» (opción A):** se quitó, junto con el selector «Vista». Ahora el filtro **País** de arriba también
decide contra quién se compara el coaching: País = Guatemala compara contra el equipo de Guatemala, y Todos, contra los
dos países. Con «GT + SV» no cambia ninguna cifra. Con un solo país, la ficha muestra lo mismo que antes mostraba
«Equipo = ese país». El PDF no cambia (nunca usó ese selector). Está en un solo lugar, `filtrosEquipoComparacion` en
`pantalla/datos.js`.

**Pendiente:** la «vista del jefe» usará equipos por jefe (lista de jefes y sus ejecutivos), no por país. Se agregará
en `filtrosEquipoComparacion` cuando exista esa lista.

**Recorrido:** en el Panel, la etapa de Cierre ya no se resalta en amarillo, porque la marca «Aquí se frenan más» va
en la línea. La ventana del ejecutivo conserva el resaltado de su punto débil.

## D27 · 26/11/2026 · Rediseño, Partes 3 a 6: gráfica, Detalle de leads, Forecast y limpieza

Solo cambian el diseño y el orden. Los cálculos, filtros y consultas no cambian, y las cifras se compararon antes y
después con datos inventados.

**Panel completo (orden final):** 6 números · Qué atender hoy · Recorrido · Tabla de ejecutivos · Leads y unidades
por mes · Embudo de conversión por mes.

- **Gráfica «Leads y unidades por mes»:** 3 barras por mes, una al lado de la otra, cada una con su número encima:
  azul = leads calificados, verde = ganados y amarillo = unidades vendidas. Tiene **una sola escala** (se quitaron la
  escala doble y la línea de ganados). Debajo de cada mes: «Conversión X % · N unidades por cierre». El título dice
  cuál fue el mejor mes (el de más ganados; si empatan, el de más unidades). Con el filtro «Todos», la barra azul
  sigue igual que antes (azul calificados + gris no calificados = leads del mes) y la leyenda lo dice. Se mantienen la
  ventanita al pasar el mouse, el clic en el mes y «Tabla por país». Cada lead cuenta en un solo mes: los ganados, en
  el mes de cierre; los demás, en el mes en que entraron (regla de siempre).
- **Tabla por país:** las dos tablas a la vez («Resumen mensual · Guatemala» y «· El Salvador»), con todas sus
  columnas. «No calificados» se ve siempre y sale en 0 con el filtro Calificado. Cada tabla tiene su barra para
  bajar.
- **Embudo por mes:** 4 tarjetas por fila y más bajito, con los mismos datos y colores.
- **Se quitaron:** la «Comparativa regional» GT vs SV y las tarjetas grandes por país. Sus cifras siguen en los 6
  números (desglose GT · SV), en la tabla de ejecutivos y en las tablas por país.

**Detalle de leads:**

- El título dice cuántos leads van más de 2 días hábiles tarde en su etapa.
- Las 7 vistas rápidas se quedan. Además hay botones **Todos · Rojo · Ámbar · A tiempo**, con su cantidad, como
  filtro extra dentro de la vista elegida. El PDF no usa ese filtro y sigue igual.
- Por defecto se ven 8 columnas: Cliente, Ejecutivo, País (GT/SV), Etapa, Días en etapa (con barrita), Semáforo,
  Próxima gestión y Unidades. Las demás se agregan con «Columnas» y ninguna se borró. «Semáforo» es el nombre en
  pantalla de «SLA de etapa»; el Excel conserva el nombre de siempre.
- Orden por defecto: primero los más atrasados (rojo → ámbar → a tiempo → sin fecha → cerrado; dentro de cada
  color, más días primero). Clic en un encabezado ordena por esa columna, como antes.
- **Excel:** exporta las columnas de siempre (los grupos que antes se veían por defecto) más los grupos que se
  activen, y las filas que se ven (vista, búsqueda y color). Con el color en «Todos» exporta las mismas filas que
  antes; solo cambia el orden, que ahora es «primero los más atrasados».

**Semáforo de etapa:** con atraso, la pastilla dice solo cuánto va tarde («Rojo · 13 d tarde»); a tiempo dice
«Verde · 1 d». Los días en etapa siguen en su columna y al pasar el mouse.

**Ficha de coaching:** la conversión se muestra con un decimal (8.3 %).

**Forecast (orden):**

1. **Gestión de seguimientos:** vencidos, para hoy y próximos (`classifyFollowUps`), con una tabla que pone primero
   los más atrasados. El último comentario se muestra como etiquetas cortas (rubro · medio de seguimiento · respuesta
   del cliente) y el texto completo al pasar el mouse.
2. **Forecast:** 7/15/30/60 días, sus números, el criterio y la tabla. Si no hay casos, en vez de la tabla vacía sale
   un mensaje con los botones «Probar con 60 días» y «Ver los vencidos». Al final, «Oportunidades abiertas por etapa»
   como barras de color (rojo / ámbar / a tiempo / sin fecha) con cantidad y promedio de días; clic para ver los
   leads.
3. **¿Por qué se pierden los leads?:** salió del Panel. Muestra el motivo principal, las 6 primeras causas, «Ver
   motivos más pequeños» para el resto, las pérdidas por ejecutivo y el detalle de casos.

**PDF:** solo cambiaron los textos («Tarjetas por país» → «Resultados por país» en la descripción del módulo y en el
título de su sección). El contenido del PDF se arma con sus propias cuentas de `datos.js` y no dependía de las
secciones que se quitaron.

**Código que se dejó de usar y se quitó:** la gráfica de columnas con escala doble, las tarjetas por país, la
comparativa regional, el Top 5 en barras, las tarjetas SLA y «Prioridad del equipo» como bloque aparte.
