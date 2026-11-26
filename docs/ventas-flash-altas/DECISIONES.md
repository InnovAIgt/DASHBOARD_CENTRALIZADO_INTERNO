# Decisiones · Flash de altas

Decisiones tomadas para Flash de altas, con fecha. Lo más reciente va arriba. Las D1–D10 vienen de la rama
`ventas-flash-altas` (18/11/2026); aquí quedan solo las que aplican al Flash de `main` (ver la nota al final).

## D13 · 25/11/2026 · Altas sin «?_=<hora>»
La página pedía las altas con `?_=<hora>` para que nadie guardara copias. Ahora la dirección es siempre la misma
(`/api/ventas/flash-altas`), así la red de Vercel guarda la respuesta 10 min (`s-maxage=600`) y no se pide a SAN cada
vez que alguien abre la página. El navegador sigue sin guardar copia (`cache: 'no-store'`).

## D12 · 25/11/2026 · Tipo de cambio por el servidor
La página pedía la tasa directo a Render (`excel-parser-m9q8`). Si Render estaba dormido, la consulta se cortaba a
los 20 s y la pastilla de estado pasaba a «Sin conexión con el servidor de datos». Ahora la pide a
`/api/ventas/tipo-cambio`: el servidor guarda la última tasa buena 6 h y siempre responde en menos de 10 s (la tasa
guardada, la nueva o «sin tasa»). `estandar.js` no se tocó.

## D11 · 25/11/2026 · Altas de SAN por el servidor del portal
La página leía `datos.json` del repo `InnovAIgt/Dashboard---flash-altas` (GitHub Pages, público). Ahora lee
`/api/ventas/flash-altas`: el servidor pide a SAN con `FLASH_API_KEY` (solo servidor) y devuelve el mismo formato
(`{ ok, actualizado, total, data }`, 16 campos). Caché por mes (cerrados 6 h, actual 15 min), 2 reintentos por mes y,
si algo falla o llegan muchas menos altas, la última copia buena (nunca datos incompletos). Las 3 rutas de Flash van en
una sola función de Vercel (`api/ventas/flash.js`). El robot del otro repo sigue activo por el reporte de correo.
Detalle: [README.md](README.md).

## D5 · 18/11/2026 (aplicada a `main` el 25/11/2026) · Sin copia de respaldo: si las altas no llegan, mensaje claro
El HTML traía una copia de 3,987 altas del 05/10/2026 **con nombres de clientes**, y la usaba sola si la fuente no
respondía (mostraba datos de otro mes como si fueran de hoy). Por decisión de Keily **se quitó**. Ahora, si las altas no
llegan o vienen vacías, la página muestra **«No se pudieron cargar las altas. Intenta más tarde.»**, sin datos viejos y
sin detalles técnicos (quedan en la consola). Lo hace `obtenerAltas()`; lo prueba `server/flashAltas/flashAltas.test.js`.
La fuente `embebido` ya no existe en `CONFIG.FUENTE`. Quitarla del archivo **no** la borra del historial del repo
(PENDIENTES).

## D3 · 18/11/2026 (aplicada a `main` el 25/11/2026) · «En proceso» igual que el correo diario
Regla de la función del correo (`InnovAIgt/Dashboard---flash-altas`, `supabase/functions/reporte-flash-publico`, cambios
del 16/11): **no contar renovaciones** = `RENOVACION` como **valor completo** en `negocio` o `tipoContratacion`
(«RENOVACION Y ADICION» sí cuenta). Antes, `main` quitaba cualquier valor que *contuviera* «renovación». Siguen las
reglas de siempre: `en_proceso`, sin B800, sin BACKUP y dentro del período; la cifra son los **anexos** (suma de
`cantidad`). Orden de los contadores de la consola: B800, BACKUP en negocio, BACKUP en tipoContratacion, renovación.

## D2 · 18/11/2026 · Preofertas por una ruta del servidor (llave fuera del HTML)
La llave de Workflow va solo en la variable de servidor **`WORKFLOW_API_KEY`** (sin `VITE_`). En `main` la ruta es
`/api/ventas/flash-preofertas` (`server/flashPreofertas.js`); la de la rama vieja (`/api/workflow/preofertas`) no se
trajo. Flash de altas ya no tiene la llave; **Activaciones** y `SecretsModal.tsx` todavía sí (PENDIENTES).

## Nota · lo que no se trajo de la rama `ventas-flash-altas`
D1 (orden del diseño aprobado), D4 (medidas Ventas / Anexos / Unidades), D6 (ingreso promedio por unidad, versión de
esa rama), D7 (ejecutivos en 0), D8 (pantalla completa), D9 (detalle del ingreso) y D10 (período del mes actual) son del
diseño de esa rama, distinto del Flash de `main`. Quedan en esa rama por si se quieren retomar.
