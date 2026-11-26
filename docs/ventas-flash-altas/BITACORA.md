# Bitácora · Flash de altas

Lo más reciente va arriba.

## 2026-11-25 · En proceso, sin copia de respaldo, pruebas y documentos (rama `feature/flash-altas-servidor`)

- **En proceso:** regla del correo del 16/11 (renovación = valor completo `RENOVACION`; «RENOVACION Y ADICION» sí
  cuenta), traída de la rama vieja (DECISIONES D3).
- **Sin copia de respaldo:** se quitó de `flash-altas.html` la copia del 05/10/2026 con nombres de clientes (3,987
  filas; el archivo bajó de ~880 KB a ~167 KB). Si las altas no llegan: «No se pudieron cargar las altas. Intenta más
  tarde.» (D5).
- **Caché de Vercel:** la consulta de altas ya no lleva `?_=<hora>` (D13).
- **Pruebas:** `server/flashAltas/flashAltas.test.js` rehecho con **datos inventados** sobre el código real de la
  página (traducción de campos, BACKUP, En proceso, B800, preofertas, mensaje sin altas, rutas). No se trajo
  `datos-fijos-2026-11-18.json`.
- **Documentos:** se juntaron los de la rama vieja con estos (README, DECISIONES, PENDIENTES); lo que era solo del
  diseño de esa rama quedó anotado en DECISIONES. Nuevo pendiente: el repo es público (decidir con Eduardo).
- No se tocaron Activaciones, `SecretsModal.tsx` ni otros dashboards.

## 2026-11-25 · Altas y tipo de cambio por el servidor (rama `feature/flash-altas-servidor`)

- Nueva ruta `/api/ventas/flash-altas`: lee SAN con `FLASH_API_KEY` y devuelve el mismo formato que `datos.json`
  (16 campos). Caché por mes (cerrados 6 h, actual 15 min), 2 reintentos por mes y la última copia buena si algo falla.
- Nueva ruta `/api/ventas/tipo-cambio`: el servidor guarda la tasa de Render 6 h y responde en menos de 10 s, para que
  la pastilla no pase a «Sin conexión» cuando Render está dormido. `estandar.js` no se tocó.
- `api/ventas/flash-preofertas.js` pasó a ser el despachador `api/ventas/flash.js` (3 rutas, 1 función; `main` sigue
  con 7). La ruta de preofertas responde igual. `server.ts` atiende las 3 rutas en local.
- En `flash-altas.html` cambiaron `API_URL` y la dirección del tipo de cambio. La base es el Flash de `main`.
- El robot y `datos.json` del otro repo siguen activos por el reporte de correo.
- Revisión (solo lectura): el repo es **público**; `datos-fijos-2026-11-18.json` (commit `b416984`) no llegó a `main`
  pero está en la rama `ventas-flash-altas` y en el PR #8 (abierto). La llave de Workflow sigue escrita en
  `activaciones.html` y `SecretsModal.tsx` de `main` (PENDIENTES).

## 2026-11-18 · Rama `ventas-flash-altas` (resumen; el detalle está en esa rama)

- Orden del diseño aprobado, medidas Ventas / Anexos / Unidades, ingreso promedio por unidad con detalle, ejecutivos en
  0, período del mes actual, preofertas por `/api/workflow/preofertas`, «En proceso» como el correo y sin copia de
  respaldo. De eso, el 25/11 se trajo a `main` solo «En proceso» (D3) y quitar la copia (D5).
