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
