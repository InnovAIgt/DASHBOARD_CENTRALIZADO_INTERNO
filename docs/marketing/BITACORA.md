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
