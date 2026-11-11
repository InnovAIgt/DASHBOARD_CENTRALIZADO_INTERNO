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

**Qué no se tocó:** `public/dashboards/activaciones/activaciones.html`,
`public/assets/css/activaciones.css`, `estandar.css`, el Flujo de ventas viejo, los demás
dashboards, `src/index.css`, `PortalLayout.tsx`, `package.json` ni `vercel.json`.
