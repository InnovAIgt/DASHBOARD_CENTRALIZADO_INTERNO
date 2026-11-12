# Bitácora · Flujo de ventas v2

Rama de trabajo: `leads`

---

## Paso 0 · Documentación base — 11/11/2026 ✅

**Qué se hizo:** se creó la carpeta `docs/marketing/` con:
- `README.md`: qué es el módulo, de dónde salen los datos y cómo probarlo.
- `REQUISITOS.md`: lo que pidió el ingeniero (R1 a R13) y si se puede hacer.
- `DECISIONES.md`: decisiones D1 a D7.
- `RETIRO_VERSION_ANTERIOR.md`: cómo se retira el dashboard viejo en 3 etapas.
- `BITACORA.md`: este archivo.

**Qué no se tocó:** ningún dashboard existente.

---

## Paso 1 · Conexión segura con Prospekt IA — 11/11/2026 ✅ (falta prueba con llave real)

**Qué se hizo:**
- `server/marketingReuniones.js` (nuevo): pide una página de leads a Prospekt IA
  agregando `RED_API_KEY` desde el servidor.
- `api/marketing/reuniones.js` (nuevo): función de Vercel que expone
  `GET /api/marketing/reuniones?offset=N`.
- `server.ts`: se agregó la misma ruta para trabajar en local, y ahora también lee
  `.env.local`.
- `.env.example`: se agregó `RED_API_KEY=""` (vacío, sin prefijo `VITE_`).

**Pruebas hechas (en local, sin la llave real):**

| Prueba | Resultado esperado | Resultado |
|---|---|---|
| Consultar sin `RED_API_KEY` | Aviso "RED_API_KEY no está configurada" (500) | ✅ |
| Enviar un POST | Rechazo "Usa GET" (405) | ✅ |
| Llave falsa | Error controlado de conexión (502) | ✅ |
| `npm run build` | Compila sin errores | ✅ |

**Falta:** probar con la llave real en una versión de prueba de Vercel. Para eso hay que
guardar `RED_API_KEY` en Vercel → Settings → Environment Variables.

**Nota encontrada:** `npm install` falla en este repo por un conflicto de versiones que
ya existía (vite 8 pide esbuild 0.28, el proyecto fija esbuild 0.25). Para las pruebas
se usó `npm install --legacy-peer-deps`. No se cambió `package.json`. Avisar al equipo.

**Qué no se tocó:** ningún dashboard existente, `vercel.json`, ni Supabase.

**Actualización 11/11/2026:** se probó en local con la llave real (`.env.local`, que Git
ignora). La conexión respondió 200 con 50 registros.

---

## Paso 3.1 · Quitar el teléfono del cliente en la conexión — 11/11/2026 ✅

**Qué se hizo:**
- `server/marketingReuniones.js`: antes de responder, quita `client_phone` de cada
  registro (en la lista principal o en `leads`, `reuniones`, `data`, `items` o `results`).
  Si la respuesta de Prospekt IA no es JSON, se devuelve tal cual.
- `client_name` **se conserva**: el negocio necesita ver el nombre del cliente.
  Ver [DECISIONES.md](DECISIONES.md), D8.
- Como `api/marketing/reuniones.js` (Vercel) y `server.ts` (local) usan este mismo
  archivo, el cambio aplica en los dos.

**Pruebas hechas:**

| Prueba | Resultado |
|---|---|
| Respuesta que no es JSON → se devuelve igual | ✅ |
| Datos de ejemplo en lista directa y en `leads`, `reuniones`, `data`, `items`, `results` → quita el teléfono y conserva el nombre | ✅ |
| Local con la llave real, `offset=0` → código 200, 50 registros | ✅ |
| Ningún registro trae `client_phone` | ✅ |
| `client_name` sigue llegando (50 de 50 registros) | ✅ |
| Los otros 30 campos y las claves `items`, `total`, `limite`, `por_pais`, `total_por_pais` siguen iguales | ✅ |
| `npm run build` | ✅ |

**Pendiente:** agregar login para proteger los datos de clientes (D8).

**Qué no se tocó:** ningún dashboard existente, `api/marketing/reuniones.js`, `server.ts`,
`vercel.json`, Supabase ni `package.json`.

---

## Paso 3.2 · Revisión de la paginación — 11/11/2026 ✅ (sin cambios de código)

**Qué se hizo:** se consultó `/api/marketing/reuniones` en local con `offset=0, 50, 100…`
hasta que una página trajo menos de 50 registros.

**Resultado:**

| Dato | Valor |
|---|---|
| Páginas | 34 (33 de 50 registros + la última de 37) |
| Total de registros | **1,687** |
| Ids repetidos | **0** (1,687 ids distintos) |
| Guatemala (GT) | 902 |
| El Salvador (SV) | 785 |
| Fechas de creación | del 24/04/2026 al 11/11/2026 |

**Comprobaciones:**
- `offset=50` trae datos distintos a `offset=0` → la paginación avanza bien.
- Los campos `country` y `pais` coinciden en todos los registros (solo GT y SV).
- La suma de `total_por_pais` de todas las páginas da lo mismo que contar los registros
  (GT 902, SV 785).

**Ojo al leer la API:** `total` y `total_por_pais` cuentan **solo la página actual**, no el
total general. Por eso el dashboard tiene que recorrer todas las páginas, como ya hace la
lógica de DashboardLeads (pide páginas hasta que una trae menos de 50 y rechaza ids
repetidos).

**Qué no se tocó:** ningún archivo de código.

---

## Paso 3.3 · Lógica de la Vista 1 copiada de DashboardLeads — 11/11/2026 ✅

**Qué se hizo:** se creó `src/modulos/marketing/flujo-ventas-v2/` con copias de
`InnovAIgt/DashboardLeads` (carpeta `Dashboard-Leds/src/`). Cada archivo empieza con el
comentario `// Copiado de InnovAIgt/DashboardLeads (<ruta original>)`.

| Carpeta | Archivos |
|---|---|
| `utils/` | `leads.js`, `analytics.js`, `dates.js` |
| `types/` | `lead.js` |
| `hooks/` | `useLeads.js`, `useFilters.js` |
| `context/` | `FiltersProvider.jsx`, `filtersContext.js` |
| `services/` | `api.js` |
| `components/` | `AdvisorDrawer.jsx`, `KpiGrid.jsx`, `LeadDetailModal.jsx`, `LeadTable.jsx`, `MonthDetailModal.jsx`, `charts.jsx`, `ui.jsx`, `FilterBar.jsx` |
| `views/` | `AnalyticsView.jsx` |

**Únicos cambios respecto al original:**
- `services/api.js`: la ruta pasa de `/api/metrics/reuniones` a `/api/marketing/reuniones`.
- `components/FilterBar.jsx`: es nuevo porque en DashboardLeads la barra de filtros vive
  dentro de `DashboardHome.jsx`, junto con la Vista 2 y el modo demo. Se copiaron sin
  cambios solo sus piezas (`MONTH_TO_DAY_KEYS`, `MultiSelect`, `MonthToDayFilter`,
  `FilterBar`), con los imports que usan y un `export` al final.

**No se trajo:** la Vista 2 (`FollowUpView.jsx`), el modo demo (`demoData.js`), el logo ni
`DashboardHome.jsx`.

**Pruebas hechas:**

| Prueba | Resultado |
|---|---|
| Las 17 copias son idénticas al original (salvo la ruta de `api.js`) | ✅ |
| El bloque copiado en `FilterBar.jsx` es idéntico al de `DashboardHome.jsx` | ✅ |
| La lógica copiada carga los datos reales (local) | ✅ 1,687 leads, sin ids repetidos |
| El nombre del cliente llega a la lógica | ✅ 1,686 de 1,687 (1 viene sin nombre) |
| Calificados + no calificados + sin clasificar = total | ✅ 292 + 1,395 + 0 = 1,687 |
| Suma por país = total | ✅ GT 902 + SV 785 = 1,687 |
| Suma por mes = total | ✅ 8 meses (abr a nov 2026) = 1,687 |
| Suma por asesor = total | ✅ 15 asesores = 1,687 |
| Partición de estados (en proceso + ganados + perdidos + inválidos) | ✅ 524 + 67 + 1,095 + 1 = 1,687 (diferencia 0) |

**Avisos de calidad de datos** (los da la revisión de conciliación `calculateMetrics`; no
cambian los totales):
- 148 leads perdidos **sin motivo** de pérdida.
- 9 leads con estado **abierto** en la API pero con resultado de venta **cerrado**; se
  cuentan como abiertos.

**Nota:** en DashboardLeads esa revisión de conciliación existe en la lógica, pero ninguna
pantalla la usa ni muestra un aviso.

**Qué no se tocó:** el portal (todavía no muestra este módulo), ningún dashboard existente,
`src/index.css`, `package.json`, `vercel.json` ni Supabase.

---

## Paso 3.4 · Vista 1 dentro del portal — 11/11/2026 ✅ (pendiente revisión visual)

**Qué se hizo:**
- `src/modulos/marketing/flujo-ventas-v2/FlujoVentasV2.jsx` (nuevo): muestra la Vista 1
  (KPIs, gráfica por mes, comparativa GT/SV, top por ejecutivo, embudo mensual, resumen por
  asesor y resumen mensual por país) con su barra de filtros y el botón "Actualizar".
  Es la misma lógica de `DashboardHome.jsx`, sin la Vista 2, sin modo demo y sin logo.
  Todo va dentro de un contenedor con la clase `fv2`.
- `src/modulos/marketing/flujo-ventas-v2/flujo-ventas-v2.css` (nuevo): los estilos de
  DashboardLeads (`Dashboard-Leds/src/index.css`) **encerrados**:
  - Todas las reglas aplican solo dentro de `.fv2` y de las 3 ventanas emergentes del
    módulo (detalle por asesor, por mes y por lead), que se dibujan fuera del contenedor.
  - `:root` y `body` ya no se usan; sus valores se aplican al contenedor (sin pintar el fondo).
  - Las 11 animaciones llevan prefijo `fv2-`. Sin esto, la animación "pulse" del original
    reemplazaba la del portal (el puntito que parpadea en el encabezado).
  - Los colores de `@theme` (ink, muted, line, accent…) existen **solo dentro de `fv2`**.
    Tailwind genera únicamente las 22 clases de color que usa el módulo (lista cerrada).
  - No se importa Tailwind por segunda vez. No se trajo `@property --qualified-angle`
    (solo lo usaba una dona que ninguna pantalla usa).
- `src/components/layout/PortalLayout.tsx`: entrada nueva **"Flujo de ventas v2 (prueba)"**
  en MARKETING, debajo de "Flujo de ventas", que muestra `FlujoVentasV2`. La entrada vieja
  quedó igual.
- `docs/marketing/REQUISITOS.md`: nuevo pendiente para el Paso 4 (aviso de calidad de datos).

**¿Chocan los `@theme` con el portal?** No por nombre: el portal usa `--accent`,
`--text-muted`, etc.; DashboardLeads usa `--color-accent`, `--color-muted`, etc. El único
efecto global era `--font-sans` (la letra por defecto de Tailwind en todo el portal); no se
trajo: la letra Inter se aplica solo dentro de `fv2`. Tampoco se tocó `src/index.css`.

**Pruebas hechas:**

| Prueba | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run lint` (revisión de tipos) | ✅ |
| Comparar la hoja de estilos del portal antes/después: 484 reglas nuevas, todas dentro de `fv2` o de sus ventanas | ✅ |
| Ninguna regla nueva sobre `:root`, `html`, `body`, `*` o etiquetas sueltas | ✅ |
| Ninguna regla o valor que ya existía se quitó ni cambió | ✅ |
| Variables generales nuevas: solo 3 estándar de Tailwind (`--color-slate-950`, `--leading-tight`, `--blur-sm`) por clases que usa el módulo; ninguna de DashboardLeads | ✅ |
| Revisión en pantalla | ⏳ pendiente (la hace Keily) |

**Nota sobre el login del portal:** al revisar cómo se entra al portal se encontró que el
login actual **acepta cualquier usuario y contraseña** (`src/context/AuthContext.tsx`, función
`login`). Como la v2 muestra nombres de clientes, esto refuerza el pendiente de D8 (agregar
login para proteger los datos de clientes). No se cambió.

**Qué no se tocó:** `flujo-ventas.html` y su entrada del menú, los demás dashboards,
`src/index.css`, `package.json`, `vercel.json` ni Supabase.

---

## Paso 3.4b · Rediseño visual con el estilo de Activaciones — 11/11/2026 ✅ (pendiente revisión visual)

**Qué se hizo:**
- **Diseño:** tema oscuro con los colores de Activaciones (verde `#2f8f76`, amarillo
  `#c59600`, rojo `#c43c50`, azul `#4f8fd8`, fondo `#151821`, texto `#e8eaf0` / `#8b909e`),
  sus tarjetas de indicadores, paneles de gráficas, píldoras, tablas y ventanas. Los estilos
  se **copiaron** a `flujo-ventas-v2.css` con nombres propios (`fv2-`); Activaciones no se
  modificó. Ya no se usan los estilos claros de DashboardLeads.
- **Textos propios:** título, subtítulos y "Ganados" en lugar de "Radicados" en toda la
  pantalla. Se quitó de la pantalla toda mención a DashboardLeads (quedan solo en
  comentarios del código y en esta documentación).
- **Indicadores (6, en este orden):** Total leads, Calificados, Ganados (con la conversión
  general ganados ÷ total como nota), Conversión de calificados (`qualifiedConversion` de
  `summarize`), Unidades vendidas y Unidades por cierre. No se creó ninguna fórmula nueva.
- **Filtros (estilo Activaciones):** País con banderas (Todos / GT / SV); Período
  desde–hasta sobre la fecha de referencia del lead (`leadReferenceDate`: fecha de cierre si
  es ganado, si no fecha de creación), que reemplaza a "Month to day"; botón "Filtros" con
  panel de 2 columnas (Asesor / Ejecutivo y Tipo de lead) con buscador, casillas, "Limpiar
  todo" y "Aplicar"; botón "Volver a filtros por defecto". Por defecto: todos los países y
  sin límite de período (abrir en el mes actual queda para el Paso 4).
- **Gráficas nuevas con los mismos datos:** líneas por mes con área tenue, guías suaves y
  línea guía con recuadro de detalle al pasar el cursor; tarjetas por país con bandera,
  conversión y barras de leads, **calificados**, ganados y unidades; top 10 ejecutivos con
  barras horizontales; embudo por mes en tarjetas (leads → calificados → ganados).
- **Ventanas de detalle** (ejecutivo, mes y lead) en tema oscuro, con el nombre del cliente.
  Ahora quedan por encima del menú lateral del portal.

**Archivos:**
- Nuevos en `src/modulos/marketing/flujo-ventas-v2/pantalla/`: `datos.js`, `comunes.jsx`,
  `Filtros.jsx`, `graficas.jsx`, `Tablas.jsx`, `Ventanas.jsx`, `VistaGeneral.jsx`.
- Reescritos: `FlujoVentasV2.jsx` y `flujo-ventas-v2.css`.
- **Borrados** (pantallas copiadas de DashboardLeads que ya no se usan; Git conserva el
  historial): `components/AdvisorDrawer.jsx`, `components/FilterBar.jsx`,
  `components/KpiGrid.jsx`, `components/LeadDetailModal.jsx`, `components/LeadTable.jsx`,
  `components/MonthDetailModal.jsx`, `components/charts.jsx`, `components/ui.jsx` y
  `views/AnalyticsView.jsx`.
- **Sin cambios:** la lógica (`utils/`, `types/`, `hooks/`, `context/`, `services/`). Las
  agrupaciones que vivían dentro de las pantallas borradas (por ejemplo, ejecutivos por país,
  top 10 y embudo por mes) se movieron **tal cual** a `pantalla/datos.js`, con un comentario
  que indica de qué archivo y líneas salieron.

**Pruebas hechas:**

| Prueba | Resultado |
|---|---|
| `npm run build` y `npm run lint` | ✅ |
| Lógica copiada (`applyFilters`) y pantalla nueva (`aplicarFiltros`) dan resultados idénticos | ✅ |
| Cifras con los datos reales (ver nota) | ✅ 1,690 leads · 293 calificados · 67 ganados · 325 unidades |
| Sumas por país, por mes, por ejecutivo, embudo "Todos" y resúmenes mensuales = total | ✅ |
| País: GT + SV = total | ✅ 902 + 788 |
| Período: la suma de cada mes por separado = total; 01/11–11/11 = mes de noviembre | ✅ |
| Tipo de lead = calificado → igual a "Calificados" | ✅ |
| Hoja de estilos del portal: 242 reglas nuevas, todas dentro de `.fv2` / `.fv2-ventana`; animaciones con prefijo `fv2-`; ningún valor existente cambió | ✅ |
| Archivos de Activaciones y otros dashboards sin cambios (`git status`) | ✅ |
| Revisión en pantalla | ⏳ pendiente (la hace Keily) |

**Nota sobre las cifras:** en el paso 3.3 la API entregaba 1,687 leads (292 calificados). Al
probar este paso entrega **1,690** (293 calificados): entraron leads nuevos el 11/11/2026. La
lógica copiada sin cambios da exactamente las mismas cifras que la pantalla nueva; ganados
(67) y unidades (325) no cambiaron.

**Ajuste de orden (11/11/2026):** las tarjetas por país (Guatemala / El Salvador) se movieron
**hasta arriba**, justo debajo de la barra de filtros y antes de los 6 indicadores, como en
los demás dashboards del centralizado. Cada tarjeta muestra bandera, nombre del país, Total
leads, Calificados, Ganados, Conversión de calificados y Unidades por cierre (de
`byCountry`, que usa `summarize` por país; sin fórmulas nuevas) y respeta los filtros activos.
La gráfica mensual ahora ocupa todo el ancho.

| Prueba del ajuste | Resultado |
|---|---|
| `npm run build` y `npm run lint` | ✅ |
| Sin filtros: GT + SV = indicadores (total, calificados y ganados) | ✅ |
| País = GT: la tarjeta de SV queda en 0 y la de GT = indicadores | ✅ |
| Tipo = calificado y Período 01/10–31/10: GT + SV = indicadores | ✅ |

**Observación para el Paso 4 — ✅ RESUELTO en el paso 3.4c (DECISIONES D10):** la "Conversión de calificados" de la lógica
copiada (`qualifiedConversion` = ganados ÷ calificados) cuenta en "ganados" **todos** los
ganados, también los que vienen de leads no calificados. Por eso, al filtrar Tipo =
calificado, el porcentaje baja (por ejemplo, Guatemala pasa de 18.4 % a 12.3 %). Conviene
confirmar con el ingeniero si debe contar solo los ganados calificados.

**Qué no se tocó:** `public/dashboards/activaciones/activaciones.html`,
`public/assets/css/activaciones.css`, `estandar.css`, el Flujo de ventas viejo, los demás
dashboards, `src/index.css`, `PortalLayout.tsx`, `package.json` ni `vercel.json`.

---

## Paso 3.4c · Ajustes visuales y conversión de calificados — 11/11/2026 ✅ (pendiente revisión visual)

**Qué se hizo:**
1. **Carga:** se quitó el recuadro "Cargando leads desde Prospekt IA…". El botón de actualizar
   pasó al encabezado: mientras carga, el ícono gira y al lado dice "Actualizando…". Si hay
   error, se muestra el aviso.
2. **Indicadores compactos y que se pueden cliquear:** las 6 tarjetas en una fila (3 o 2 por
   fila en pantallas más angostas). Cada una abre la ventana **"Detalle de leads"** con los
   filtros activos: Total leads → todos; Calificados → calificados; Ganados → ganados, con su
   calificación; Conversión de calificados → calificados, marcando los que ganaron; Unidades
   vendidas y Unidades por cierre → ganados con sus unidades. Columnas: cliente, ejecutivo,
   país, etapa, estado, fecha (de cierre si es ganado; si no, de creación) y unidades. Tiene
   buscador y orden de la fecha más reciente a la más antigua; cada lead abre su ficha.
   La tarjeta de Ganados dice "X de leads calificados · Y de no calificados".
3. **Gráfica "Leads por mes":** columnas apiladas Calificados (azul `#4f8fd8`) + No calificados
   (gris) = leads del mes, y línea de Ganados (verde `#2f8f76`) con su propia escala a la
   derecha. Al pasar el cursor: leads, calificados, no calificados, ganados, unidades y
   conversión de calificados del mes. Se mantiene la nota de fechas.
4. **"Desempeño por ejecutivo"** (con el estilo de las barras del embudo del Flujo de ventas
   viejo; ese archivo solo se leyó): los 15 ejecutivos, cada uno con nombre y país, una barra
   de 3 colores — Ganados (verde), Calificados sin ganar (azul), No calificados sin ganar
   (gris) —, su total de leads y una píldora con su conversión de calificados. Orden: ganados y
   luego calificados. Clic → ventana del ejecutivo.
5. **Conversión de calificados corregida** (DECISIONES D10): ganados calificados ÷
   calificados. Se aplica en la tarjeta de indicadores, las tarjetas por país, el desempeño por
   ejecutivo, la gráfica por mes, el embudo por mes (el % de "Ganados") y las ventanas del
   ejecutivo y del mes. En las tablas de resultados, la columna "Conversión" (ganados ÷ total)
   se renombró **"Conversión general"** para que no se confunda.

**Conteos nuevos en `pantalla/datos.js`** (con comentario de dónde sale cada uno; la lógica
copiada no cambió): `conversionCalificados` (ganados calificados, ganados no calificados y la
conversión corregida), `partesEjecutivo` (ganados + calificados sin ganar + no calificados sin
ganar), `desempenoEjecutivos` (reemplaza al top 10), `noCalificados` por mes (leads −
calificados) y `leadsDeIndicador` (listas de la ventana "Detalle de leads").

**Pruebas hechas (datos del 11/11/2026: 1,693 leads):**

| Prueba | Resultado |
|---|---|
| `npm run build` y `npm run lint` | ✅ |
| Ganados calificados + ganados no calificados = ganados | ✅ 43 + 24 = 67 |
| Conversión de calificados corregida (antes 22.7 %) | ✅ 43 ÷ 295 = 14.6 % |
| Por país, por mes y por ejecutivo: total, ganados y ganados calificados suman | ✅ |
| Cada mes: calificados + no calificados = leads del mes | ✅ |
| Cada ejecutivo: sus 3 partes = sus leads; los 15 suman el total | ✅ |
| Por tipo de lead: 295 + 1,398 + 0 = 1,693 | ✅ |
| Ventanas de indicadores: cada lista tiene la cantidad de su tarjeta; en "Conversión", los marcados = ganados calificados; orden por fecha | ✅ |
| Lo mismo con País = SV, Tipo = no calificado y Período de octubre | ✅ |
| Hoja de estilos del portal: 262 reglas nuevas, todas dentro de `.fv2` / `.fv2-ventana`; animaciones `fv2-`; ningún valor existente cambió | ✅ |
| `git status`: solo archivos del módulo y `docs/marketing` | ✅ |
| Revisión en pantalla | ⏳ pendiente (la hace Keily) |

**Qué no se tocó:** la lógica copiada (`utils/`, `types/`, `hooks/`, `context/`,
`services/`), Activaciones, el Flujo de ventas viejo, los demás dashboards, `src/index.css`,
`PortalLayout.tsx`, `package.json` ni `vercel.json`.

**Ajuste (11/11/2026) · aviso de consulta como en el resto del portal:** mientras se consulta
la API se muestra, debajo del subtítulo, la misma pastilla que usan los demás dashboards
(`.std-sync` de `public/assets/js/estandar.js` y `estandar.css`, la de SIMs): borde rojo
suave, spinner y el texto "Consultando la API…", que a los 2.5 segundos cambia a
"Consultando la API… puede tardar hasta un minuto". Al terminar muestra "Actualizado: HH:MM"
(o "Sin conexión con Prospekt IA" si falla) en el mismo lugar. El botón de actualizar queda a
la derecha del encabezado, sin girar, para no mostrar dos spinners. El estilo se **copió** a
`flujo-ventas-v2.css` (`.fv2-consultando`); `estandar.js` y `estandar.css` no se modificaron.
Pruebas: `npm run build` y `npm run lint` ✅; hoja de estilos del portal: reglas nuevas solo
dentro de `.fv2`, animaciones `fv2-`, ningún valor existente cambió ✅.

**Ajuste (11/11/2026) · filtros:**
- **Período por defecto = mes actual hasta hoy** (requisito R11, adelantado del Paso 4): la v2
  abre con Período del día 1 del mes hasta hoy, y "Volver a filtros por defecto" regresa a ese
  período (y a todos los países). La ✕ del Período lo quita para ver todo el historial. Esto
  reemplaza el "sin límite de período" que se había decidido en el paso 3.4b. El grupo "Todos"
  del embudo solo aparece cuando no hay ningún filtro ni período (`sinFiltros`).
- **Panel "Filtros" completo:** medía 640 px desde el botón y se salía por la derecha del
  portal, así que no se veían la columna "Tipo de lead" ni los botones "Limpiar todo" /
  "Aplicar". Ahora ocupa el ancho de la caja de filtros.

| Prueba | Resultado |
|---|---|
| `npm run build` y `npm run lint` | ✅ |
| Período por defecto (11/11/2026): 01/11/2026 → 11/11/2026; solo aparece noviembre y todos los leads tienen su fecha de referencia dentro del período | ✅ 195 leads · 23 calificados · 1 ganado |
| Por país y por ejecutivo suman el total del período | ✅ |
| "Volver a filtros por defecto" desactivado en el período por defecto y activo al cambiarlo | ✅ |
| Sin período (✕) se ve todo el historial | ✅ 1,693 leads |

---

## Paso 4.1 · Informe detallado — 11/11/2026 ✅ (pendiente revisión visual)

**Qué se hizo:**
- **Pestañas** debajo de los filtros: **Resumen** (todo lo anterior) e **Informe detallado**.
  Las dos respetan los filtros de arriba (país, período, ejecutivo y tipo de lead).
- **Vistas rápidas** (píldoras con conteo): Todos · Pipeline abierto · Ganados · Perdidos ·
  Seguimientos vencidos · Sin motivo de pérdida. "Vencidos" y "Sin motivo" usan las mismas
  reglas de `calculateMetrics` de la lógica copiada.
- **Tabla** con 54 columnas en 8 grupos (Cliente, Responsable, Calificación, Avance, Fechas,
  Propuesta, Resultado y Comentarios, este último oculto por defecto), con botones "Columnas",
  minibarra de las 6 etapas, semáforo de la próxima gestión (rojo vencida, amarillo hoy, verde a
  tiempo; solo leads abiertos), textos largos recortados (completos al pasar el cursor),
  buscador, orden por cualquier columna, 50 filas por página y clic en una fila para abrir la
  ficha. Qué campo va en cada columna y cuáles quedan fuera: DECISIONES D11.
- **Descargar Excel** (sin botón de PDF): misma plantilla y método que el Excel de
  Activaciones, replicados en `pantalla/excel.js` (Activaciones no se modificó). ExcelJS 4.4.0
  desde el CDN, respaldo en CSV, hoja "Informe detallado" + hoja "Filtros aplicados". Descarga
  lo que se ve (vista, filtros, búsqueda y columnas visibles). Nombre:
  `Informe_flujo_ventas_<GT|SV|GT-SV>_<desde>_<hasta>.xlsx`. Incluye el nombre del cliente y
  nunca el teléfono.

**Inventario de campos de la API** (11/11/2026, 1,693 leads; ver D11): 29 campos de primer
nivel; `stage_feedback_json` con las etapas 2 a 6 (y en 26 leads algunos campos sueltos en la
raíz, formato antiguo); `propuesta_json` con `rubro` y `resumen_general`; `seguimiento_json` no
es JSON: es una nota de texto libre en 222 leads y viene vacío en el resto.

**Archivos:** nuevos `pantalla/Informe.jsx`, `pantalla/informeDatos.js` y `pantalla/excel.js`;
cambian `FlujoVentasV2.jsx` (pestañas) y `flujo-ventas-v2.css`.

**Pruebas hechas (datos reales):**

| Prueba | Resultado |
|---|---|
| `npm run build` y `npm run lint` | ✅ |
| Ningún registro trae `client_phone` y ninguna columna es de teléfono | ✅ |
| Todos = Total leads · Pipeline abierto = abiertos · Ganados = indicador Ganados | ✅ |
| Perdidos, Seguimientos vencidos y Sin motivo de pérdida = `calculateMetrics` | ✅ |
| Por defecto (mes actual): 195 · 152 abiertos · 1 ganado · 42 perdidos · 40 vencidos · 0 sin motivo | ✅ |
| Todo el historial: 1,693 · 527 · 67 · 1,098 · 82 · 148 | ✅ |
| También con País = GT y con Tipo = calificado en octubre | ✅ |
| Excel (generado con ExcelJS 4.4.0 en una carpeta de pruebas aparte): en las 6 vistas, filas del Excel = filas de la tabla = conteo de la píldora; columnas = # + columnas visibles | ✅ |
| Excel: fechas como fecha `dd/mm/yyyy`, título azul marino, 4 filas congeladas, autofiltro, hoja "Filtros aplicados", nombre del cliente en todas las filas | ✅ |
| CSV de respaldo: BOM UTF-8 y una línea por lead | ✅ |
| El CDN de ExcelJS 4.4.0 responde | ✅ |
| Hoja de estilos del portal: reglas nuevas solo dentro de `.fv2`; animaciones `fv2-`; ningún valor existente cambió | ✅ |
| Revisión en pantalla y descarga desde el navegador | ⏳ pendiente (la hace Keily) |

**Qué no se tocó:** la lógica copiada, Activaciones (solo se leyó), el Flujo de ventas viejo,
los demás dashboards, `src/index.css`, `PortalLayout.tsx`, `package.json`, `vercel.json`,
Supabase ni `main`. La carpeta `.claude/` no se incluye en el commit.

**Ajuste (11/11/2026) · formato de la tarjeta, como en los demás dashboards:** el informe va
dentro de una tarjeta con el mismo formato que el "Informe detallado" de Activaciones: arriba,
en rojo pequeño, "Auditoría y exportación comercial"; título "Informe detallado de leads";
descripción de los filtros que se aplican; pastilla roja "Mostrando N leads"; botón rojo
"⬇ Descargar Excel" (estilo estándar del portal, `estandar.css`) y buscador a todo el ancho.
Se quitó el encabezado suelto ("Marketing · Flujo de ventas v2 / Informe detallado / Todo el
detalle…"). No se quitó nada más: vistas rápidas, columnas, tabla, orden, páginas, ficha y
Excel siguen igual. Estilos copiados a `flujo-ventas-v2.css`; Activaciones y `estandar.css` no
se modificaron. `npm run build` y `npm run lint` ✅; hoja de estilos del portal sin reglas
globales nuevas ✅.

**Corrección (11/11/2026) · espacio vacío bajo el buscador:** el buscador heredaba
`flex: 1 1 320px` (pensado para filas horizontales); dentro de la tarjeta, que acomoda todo en
columna, eso lo volvía de 320 px de **alto**, con la lupa flotando en medio. Se fijó
`flex: none` solo para el buscador del informe. `npm run build` y `npm run lint` ✅.

**Ajuste (11/11/2026) · lugar del botón de Excel:** como en el Informe detallado de
Facturación por línea (`facturacion-linea.html`, solo se leyó), la pastilla "Mostrando N leads
filtrados" y el botón rojo de Excel van a la **derecha del título**, en la misma fila (antes
estaban debajo de la descripción). En pantallas angostas bajan solos debajo del título.
`npm run build` y `npm run lint` ✅.

---

## Paso 4.0 · Mejoras sin saturar — 11/11/2026 ✅ (pendiente revisión visual)

**Qué se hizo (solo la lista pedida):**
1. **Filtros por defecto:** Tipo de lead = Calificado y Período = mes actual (día 1 a hoy).
   "Volver a filtros por defecto" regresa a eso.
2. **Ejecutivos en cero:** "Desempeño por ejecutivo" muestra a todos los ejecutivos del país
   elegido (sin importar período ni tipo; si se eligieron ejecutivos en Filtros, solo esos).
   Quien no tiene leads con los filtros actuales aparece al final, en gris, con 0.
3. **Embudo de ventas por etapa** (6 cuadritos tipo rastreo de pedido) **en el lugar de
   "Embudo por mes"**: llegaron, % que pasó desde la anterior, están hoy aquí y "Mejor". La
   etapa con la mayor caída va en amarillo. Nota en pantalla: "Etapa estimada: los leads
   perdidos se ubican en la última etapa con datos registrados por el vendedor" (D13). Clic →
   ventana de la etapa con 4 datos (llegaron, % que pasó a la siguiente, están hoy aquí con los
   vencidos en rojo, mejor ejecutivo) y pestañas Por mes, Por ejecutivo (menos de 5 leads =
   "pocos datos", al final) y Leads en esta etapa (clic abre la ficha).
4. **Mejor en cada etapa:** mayor % de paso a la siguiente etapa con al menos 5 leads (D13).
5. **Dos verdes** en la barra de cada ejecutivo: verde fuerte = ganados de calificados, verde
   claro = ganados de no calificados (leyenda y recuadro al pasar el cursor actualizados).
6. **Píldora roja de seguimientos vencidos** en cada ejecutivo (solo si hay); clic abre el
   detalle con esos leads. Misma regla de la lógica copiada (abierto + `isOverdue`).
7. **Regla de colores** (D12), solo en los datos.

**Lo que se quitó:** únicamente la sección "Embudo por mes" (y su cálculo
`monthlyFunnelGroups` en `pantalla/datos.js`). Ninguna otra sección desapareció: tarjetas por
país, 6 indicadores y sus ventanas, "Leads por mes", "Desempeño por ejecutivo", "Resultados por
ejecutivo", los 2 "Resultados mensuales" y las ventanas de asesor, mes y lead siguen igual y en
el mismo orden.

**Cambios de color (D12):**

| Elemento | Antes | Ahora |
|---|---|---|
| Insignia del estado "Perdido" (tablas, ventanas, informe) | rojo | gris |
| Conteo de la vista rápida "Perdidos" | rojo | gris |
| Recuadro "Motivo de pérdida" en la ficha del lead | rojo | gris |
| Métrica "Conversión de calificados" en las ventanas de ejecutivo y mes | rosa (rojo claro) | azul claro |
| Indicador "Conversión de calificados" | amarillo | azul claro |
| Métrica "Unidades vendidas" en las ventanas | amarillo | gris |
| % y barra de conversión en las tarjetas por país | verde | azul |
| Píldoras de conversión (desempeño y tablas) | verde/amarillo según umbral | azul |
| Rojo que se queda | — | seguimientos vencidos, próxima gestión vencida, error de conexión y la marca del portal |

**Pendiente (anotado):** botón "Descargar Excel" de la ventana de etapa (para la 4.1).

**Archivos:** `pantalla/datos.js` (filtros por defecto, `LIMITES_PASO`, `etapaAlcanzada`,
`embudoEtapas`, `ejecutivosEnEtapa`, `mesesEnEtapa`, `listaEjecutivos`, `esVencido`,
`partesEjecutivo` en 4 partes), `graficas.jsx` (`EmbudoEtapas`, desempeño), `Ventanas.jsx`
(`DetalleEtapa`), `VistaGeneral.jsx`, `FlujoVentasV2.jsx`, `comunes.jsx`, `informeDatos.js`,
`Informe.jsx`, nuevo `Semaforo.jsx` y `flujo-ventas-v2.css`.

**Pruebas hechas (datos reales; 5 casos: por defecto, calificados historial, todos historial,
GT octubre y un solo ejecutivo):**

| Prueba | Resultado |
|---|---|
| `npm run build` y `npm run lint` | ✅ |
| Asignación = Total leads; cada etapa ≤ la anterior; Cierre = ganados + abiertos en Cierre; en Cierre "pasaron" = ganados | ✅ |
| Σ "están hoy aquí" = abiertos; Σ vencidos por etapa = `calculateMetrics.vencidos` | ✅ |
| Ningún perdido llega a Cierre en el embudo | ✅ |
| En las 6 etapas: Σ por ejecutivo y Σ por mes (llegaron y pasaron) = embudo | ✅ |
| "Mejor" = mayor % de paso entre quienes tienen ≥ 5 leads | ✅ |
| Ejecutivos: lista = todos los del país; los de 0 al final (por defecto hoy: 6 con leads + 9 en 0) | ✅ |
| Verde fuerte + verde claro = Ganados = nota de la tarjeta (historial: 43 + 24 = 67) | ✅ |
| Cada ejecutivo: sus 4 partes = sus leads | ✅ |
| Σ píldoras de vencidos = vista "Seguimientos vencidos" = `calculateMetrics.vencidos` | ✅ |
| Hoja de estilos del portal: reglas nuevas solo dentro de `.fv2`; ningún valor existente cambió | ✅ |
| Revisión en pantalla | ⏳ pendiente (la hace Keily) |

**Nota:** con el filtro por defecto (solo calificados) el verde claro siempre es 0, porque no
entran leads no calificados; se ve al quitar el filtro de Tipo de lead.

**Qué no se tocó:** la lógica copiada, Activaciones, el Flujo de ventas viejo, los demás
dashboards, `src/index.css`, `PortalLayout.tsx`, `package.json`, `vercel.json`, Supabase ni
`main`. La carpeta `.claude/` no se incluye en el commit.

**Ajuste (11/11/2026) · ejecutivos sin leads plegados:** para que "Desempeño por ejecutivo" no
se alargue, los ejecutivos sin leads con los filtros actuales quedan **ocultos por defecto**.
Al final de la lista aparece el botón "Ver N ejecutivos sin leads en el período", que los
despliega (en gris, con 0) y cambia a "Ocultar N ejecutivos sin leads". Siguen contando en la
lista completa del país; solo cambia que se muestran a pedido. `npm run build` y
`npm run lint` ✅.

---

## Paso 4.0b · Pestañas, ejecutivos en tarjetas y ventana del ejecutivo — 11/11/2026 ✅ (pendiente revisión visual)

**Qué se hizo:**
1. **Pestañas** Resumen · Ejecutivos · Informe detallado (el Informe de la 4.1 sigue
   funcionando). Filtros y pestañas **fijos arriba** con desplazamiento interno de la v2. La
   pestaña elegida se recuerda mientras la página esté abierta.
2. **Resumen:** tarjetas por país → 6 indicadores → "Leads por mes" (clic en un mes → Detalle
   mensual con el filtro de país; pista "Clic en un mes para ver su detalle") → embudo por etapa.
   **Se quitaron del Resumen:** "Desempeño por ejecutivo", "Resultados por ejecutivo",
   "Resultados mensuales · Guatemala" y "Resultados mensuales · El Salvador". Nada más desapareció.
3. **Ejecutivos:** "Resultados por ejecutivo" en tarjetas (3, 2 o 1 por fila): iniciales,
   nombre, país, calificados recibidos, posición (#1 con ★ y borde dorado suave), círculo de
   conversión de calificados (D14), "N ventas", "de M calificados · +X de no calificados",
   unidades, "al día" o "N seguimientos vencidos" y ventas por mes en barritas (verde fuerte y
   claro). Con un solo mes en el período: "Amplía el Período para comparar meses". Los
   ejecutivos sin leads en el período, al final y apagados. Línea "Equipo: …".
4. **Detalle del ejecutivo** (mismo contenido, reordenado): encabezado con iniciales, país, #N y
   filtros Mes/Tipo; 6 indicadores; "Avance por etapa" con 6 cuadritos y "Su punto débil";
   "Ventas por mes" (clic → Detalle mensual); "Leads del ejecutivo" con pestañas
   Abiertos/Ganados/Perdidos/Vencidos, minibarra de etapas y semáforo (clic en un cuadrito filtra
   a los leads que están hoy en esa etapa); "Pronóstico" plegado con "Ver casos ▾".
5. **Detalle mensual:** igual; acepta "Todos los países" y el nombre del ejecutivo. Barras de
   desplazamiento grises en todas las ventanas.

**Código que dejó de usarse y se quitó:** el componente "Desempeño por ejecutivo", las tablas
"Resultados por ejecutivo" y "Resultados mensuales" (`Tablas.jsx`), la píldora de conversión
general, sus agrupaciones en `datos.js` (`advisors`, `advisorsByCountry`,
`monthlyCountryTables`, `ejecutivos`) y sus estilos.

**Pruebas hechas (datos reales; 4 casos: por defecto, calificados historial, todos historial y
SV ago–nov; 48 comprobaciones):**

| Prueba | Resultado |
|---|---|
| `npm run build` y `npm run lint` | ✅ |
| Σ ventas + Σ "+X no calificados" = Ganados (historial: 43 + 24 = 67) | ✅ |
| Σ calificados recibidos = Calificados · Σ unidades = Unidades vendidas · Σ vencidos = `calculateMetrics.vencidos` | ✅ |
| Línea "Equipo" = suma de las tarjetas | ✅ |
| Tarjetas = todos los ejecutivos del país (por defecto hoy: 6 + 9 apagadas); apagadas al final; #N por ventas | ✅ |
| Cada tarjeta: Σ barritas por mes = sus ganados | ✅ |
| Los cuadritos de los ejecutivos suman el embudo general (llegaron y "hoy aquí") | ✅ |
| Detalle mensual desde la gráfica: leads del mes = columna del mes | ✅ |
| Hoja de estilos del portal: reglas nuevas solo dentro de `.fv2`; ningún valor existente cambió; `src/index.css`, `PortalLayout.tsx` y `public/` sin cambios → los demás dashboards se ven y se desplazan igual | ✅ |
| Revisión en pantalla | ⏳ pendiente (la hace Keily) |

**Qué no se tocó:** la lógica copiada, Activaciones, el Flujo de ventas viejo, los demás
dashboards, `src/index.css`, `PortalLayout.tsx`, `package.json`, `vercel.json`, Supabase ni
`main`. La carpeta `.claude/` no se incluye en el commit.

**Ajuste (11/11/2026) · menú lateral escondido en la v2:** mientras está abierto "Flujo de
ventas v2 (prueba)", el menú lateral del portal se esconde y el dashboard usa todo el ancho. Al
acercar el mouse al borde izquierdo (hay una marca discreta) el menú se asoma encima del
dashboard; al alejar el mouse, se esconde solo. Al elegir otra página del menú, todo vuelve a la
normalidad. En pantallas angostas no cambia nada (el portal ya usa su botón ☰).
- `PortalLayout.tsx`: pone la clase `fv2-menu-oculto` en `.portal-app` solo en esa página, una
  franja invisible en el borde izquierdo y la clase `is-menu-asomado` al acercar el mouse.
- Estilos al final de `flujo-ventas-v2.css`, todos condicionados a `.portal-app.fv2-menu-oculto`:
  sin esa clase no aplican, así que los demás dashboards se ven igual. `src/index.css` no se tocó.
- `npm run build` y `npm run lint` ✅; hoja de estilos del portal: las únicas reglas nuevas fuera
  de `.fv2` dependen de `.fv2-menu-oculto`; ningún valor existente cambió ✅.

---

## Paso 4.2 · Descarga en PDF con la plantilla de Activaciones — 12/11/2026 ✅ (pendiente revisión en pantalla y del PDF)

**Qué se hizo:**
- Botón rojo **PDF** (clase `dashboard-pdf-trigger`, igual que Activaciones) junto a la barra de
  filtros, en la zona fija: visible en Resumen, Ejecutivos e Informe detallado.
- Ventana "¿Qué módulos deseas incluir?": la genera la herramienta compartida
  (`openModulePicker`), igual que en Activaciones. Chips: País, Período, Tipo de lead, Ejecutivos
  y Leads. Módulos: 01 Resumen, 02 Ejecutivos, 03 Informe detallado (todos marcados).
- Reporte con la plantilla de Activaciones (`pantalla/pdf.js`): encabezado con logo, "RED
  INTELFON · MARKETING", "Reporte de Flujo de Ventas", filtros, fecha de emisión, píldora
  "Conversión de calificados" y "Módulos incluidos". Detalle de módulos en DECISIONES D15.
- La vista rápida y la búsqueda del Informe ahora se guardan mientras la página esté abierta
  (se conservan al cambiar de pestaña) y son las que usa el PDF.
- Nombre: `Reporte_flujo_ventas_<GT|SV|GT-SV>_<desde>_<hasta>.pdf`.

**Archivos:** nuevo `pantalla/pdf.js`; cambian `FlujoVentasV2.jsx` (botón, carga de la herramienta,
estado del Informe), `pantalla/Filtros.jsx` (espacio para el botón) y `pantalla/Informe.jsx`
(vista y búsqueda vienen de la pantalla principal). Los archivos compartidos de PDF y
Activaciones no se modificaron.

**Pruebas hechas (HTML del reporte con los datos reales; 3 casos: por defecto, todo el
historial y GT historial con la vista Perdidos; 34 comprobaciones):**

| Prueba | Resultado |
|---|---|
| `npm run build` y `npm run lint` | ✅ |
| Plantilla: report-shell, encabezado, título, eyebrow, module-summary | ✅ |
| Píldora y KPIs del PDF = pantalla (p. ej. historial: 1,694 · 296 calificados · 67 ganados · 325 unidades · 14.5 %) | ✅ |
| Resumen en 2 páginas; Ejecutivos con todos (incluidos los de 0) + fila Equipo; Informe con 10 columnas | ✅ |
| Informe = vista rápida elegida; tope de 300 filas con nota (historial: 1,694 → 300; GT Perdidos: 625 → 300) | ✅ |
| Con 1, 2 o 3 módulos solo aparecen los elegidos | ✅ |
| Sin teléfono; en el contenido, rojo solo para lo vencido | ✅ |
| Archivos compartidos y logo se sirven desde el portal (`/assets/...` responden 200) | ✅ |
| Activaciones, `dashboard-pdf.js`, `dashboard-pdf-logo.js`, `dashboard-pdf.css` sin cambios (`git status`) | ✅ |
| Ventana y descarga del PDF en el navegador | ⏳ pendiente (la revisa Keily) |

**Qué no se tocó:** la lógica de cálculo, Activaciones, los archivos compartidos de PDF, el Flujo
de ventas viejo, `src/index.css`, `package.json`, `vercel.json`, Supabase ni `main`. `.claude/`
no se incluye en el commit.

**Ajuste (12/11/2026) · botón PDF en lugar del contador:** se quitó el texto "N de M leads" de la
barra de filtros (solo ocupaba espacio; el total de leads sigue en el indicador "Total leads" y en
el chip "Leads" de la ventana del PDF). En ese lugar, a la derecha de la barra, queda ahora el
botón rojo **PDF**. `npm run build` y `npm run lint` ✅.

**Ajuste (12/11/2026) · se quitó "Volver a filtros por defecto":** el botón se eliminó de la
barra de filtros a pedido. Los filtros por defecto (Calificado + mes actual) se siguen aplicando
al abrir la v2; para volver a ellos basta recargar la página. `npm run build` y `npm run lint` ✅.
