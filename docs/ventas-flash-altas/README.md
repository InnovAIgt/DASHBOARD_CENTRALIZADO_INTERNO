# Flash de altas · cómo lee sus datos

Dashboard **Ventas → Flash de altas** (`public/dashboards/ventas/flash-altas.html`). Desde el 25/11/2026 lee todo
**por el servidor del portal**: las llaves quedan en variables de entorno del servidor y nunca llegan al navegador.

## Qué muestra (resumen)

- Altas dadas de alta en **SAN** por ejecutivo, mes y país (GT y SV), contadas por **altas (anexos)** o **unidades
  (equipos)**. Las líneas BACKUP (equipos de respaldo) no cuentan en nada.
- **En proceso:** **anexos** (suma de `cantidad`) de las preofertas de **Workflow** en curso, sin las que ya tienen el
  B800, sin BACKUP y **sin renovaciones** (`RENOVACION` como valor completo; «RENOVACION Y ADICION» sí cuenta). Es la
  misma regla que el **correo diario** desde el 16/11 (DECISIONES D3).
- **Si las altas no llegan:** la página dice **«No se pudieron cargar las altas. Intenta más tarde.»**. Ya no hay copia
  de respaldo dentro del HTML (D5). Si no llegan las preofertas: «No se pudieron cargar las preofertas» y el resto
  sigue funcionando.

## Rutas

| Ruta (GET) | Qué trae | De dónde | Variable (solo nombre) |
|---|---|---|---|
| `/api/ventas/flash-altas` | Las altas de 2026, por país y mes | **SAN** · `{FLASH_API_SERVIDOR}/flashApi/altas?pais=&anio=&mes=` (encabezado `X-API-Key`) | `FLASH_API_KEY` |
| `/api/ventas/flash-preofertas` | Radicaciones en proceso (en vivo) | **Workflow** · `workflow.red.com.gt/api/integraciones/dashboard/preofertas` | `WORKFLOW_API_KEY` |
| `/api/ventas/tipo-cambio` | Q por US$ (tarjeta de valor en $ o Q) | Servicio de tipo de cambio en Render (`excel-parser-m9q8`) | — |

- **Vercel:** una sola función, `api/ventas/flash.js` (despachador en `server/ventasFlash.js`, igual que
  `api/marketing/canales.js`). `vercel.json` manda las 3 direcciones ahí con `?ruta=…`; las URLs no cambian.
  `main` sigue con **7 funciones** (límite 12).
- **Local:** `server.ts` atiende las mismas 3 rutas (`npm run dev`; lee `.env.local`).

## Altas (`server/flashAltasSan.js`)

- Pide a SAN un país y un mes a la vez (SV y GT, desde `FLASH_DESDE` hasta el mes actual en hora de Guatemala), de 4
  en 4.
- Devuelve **exactamente** lo mismo que el `datos.json` del robot: `{ ok, actualizado, total, data }`, con los mismos
  16 campos (`altcod, folpai, fecalt, vndcod, anajef, clinam, clicod, folcod, tipalt, tngnam, nomeqp, tipeqp, cnteqp,
  cntsim, valnet, cntmes`). Por eso en la pantalla solo cambió la línea `API_URL`.
- `actualizado` = cuándo se pidió a SAN el mes actual.
- **Caché** (en la memoria del servidor): meses cerrados **6 h**, mes actual **15 min**. Además la red de Vercel guarda
  la respuesta 10 min (`s-maxage=600`): la página pide siempre la misma dirección, sin `?_=<hora>` (D13).
- **Reintentos:** 2 por mes (a 1 s y a 3 s), hasta 15 s por intento y 45 s en total. La llave rechazada no se reintenta.
- **Protecciones (las mismas del robot):** si falla un solo mes, o llegan menos del 90 % de las altas de la última vez,
  **no** se devuelven datos incompletos: se devuelve la **última copia buena** y el encabezado
  `X-Flash-Aviso: copia-anterior; motivo=…`. Si no hay copia buena (servidor recién encendido), responde un error y la
  página muestra su aviso de siempre.
- Errores sin datos privados: «Falta configurar FLASH_API_KEY en el servidor.» (503), «SAN rechazó la llave…» (502),
  «SAN no devolvió SV 2026-11…» (502). La llave y los datos de clientes nunca salen en registros ni mensajes.

## Tipo de cambio (`server/flashTipoCambio.js`)

- El servidor guarda la última tasa buena **6 h** y siempre responde rápido: con la tasa guardada, con la nueva o, si
  Render no contesta en **8 s** y no hay tasa guardada, «sin tasa» (503).
- Así la página nunca corta la consulta por tiempo y la pastilla de estado (`estandar.js`, sin cambios) no pasa a
  «Sin conexión con el servidor de datos» solo porque Render estaba dormido.
- Mismo formato que Render (`rate_gtq_per_usd`, `date`, `source`, `stale`), más `cached` y `fetched_at`.

## Variables (Vercel y `.env.local`, solo servidor, sin `VITE_`)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `FLASH_API_KEY` | Sí | Llave de SAN (la misma que usa el robot en los Secrets de GitHub). |
| `WORKFLOW_API_KEY` | Sí | Llave de Workflow (preofertas). |
| `FLASH_API_SERVIDOR` | No | Vacía = `http://san.red.com.gt`. |
| `FLASH_DESDE` | No | Primer mes que se pide. Vacía = `2026-01`. |

## El robot del otro repo sigue activo

El robot de `InnovAIgt/Dashboard---flash-altas` (GitHub Action, `actualizar.js`) **sigue funcionando** y sigue
publicando `datos.json`, porque lo usa el **reporte diario por correo** (función de Supabase `reporte-flash-publico`,
que llama Activaciones). No se tocó. Activaciones también lee `datos.json` (nombres de clientes).

## Cómo probar con la llave real

1. Poner `FLASH_API_KEY` y `WORKFLOW_API_KEY` en `.env.local` (y en Vercel para la vista previa).
2. `npm run dev` y abrir `http://localhost:3000/api/ventas/flash-altas` → `ok: true` y `total` (≈ el del `datos.json`
   del robot). La primera vez tarda unos segundos; la segunda sale de la caché.
3. Abrir Flash de altas en el portal: la pastilla dice «Actualizado…» y los números deben coincidir con los de `main`.

## Pruebas (datos inventados, sin red)

```
node --test server/
```
- `server/flashAltas/flashAltas.test.js`: usa el **código real de la página** (extrae sus funciones de cálculo) con
  datos inventados: traducción de campos, BACKUP, En proceso, B800, preofertas, mensaje sin altas y rutas.
- `server/flashAltasSan.test.js`: formato, caché, reintentos y copia buena de las altas.
- `server/flashTipoCambio.test.js`: tipo de cambio y despachador (incluida la ruta de preofertas).

Decisiones: [DECISIONES.md](DECISIONES.md). Pendientes: [PENDIENTES.md](PENDIENTES.md). Historial: [BITACORA.md](BITACORA.md).
