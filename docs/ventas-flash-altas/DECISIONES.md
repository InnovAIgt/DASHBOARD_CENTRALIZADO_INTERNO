# Decisiones · Flash de altas

## D1 · 18/11/2026 · Orden del Resumen (diseño aprobado)
Primero se pidió Top 3 → por ejecutivo → ejecutivo × mes → indicadores. Después Keily mandó el diseño aprobado (capturas
del prototipo `Prototipado_Dashboard_Intelfon`, cambios del 18/11) y **queda así**, en pantalla y en el PDF:
**Top 3 → indicadores → Ventas por ejecutivo → Ingreso promedio por unidad → Ejecutivo × mes → Ventas por mes y por país
(lado a lado, mismo ancho)**. El PDF sigue el mismo orden (indicadores, por ejecutivo, ingreso, informe); ya no se
reordena el resumen ejecutivo.

## D2 · 18/11/2026 · Preofertas por una ruta del servidor (llave fuera del HTML)
La llave de la API de Workflow estaba escrita en `flash-altas.html` y `activaciones.html` (páginas públicas), en
`src/components/modals/SecretsModal.tsx` (que termina en el JavaScript publicado) y en `.env.example`.
Ahora:
- La llave va solo en la variable de entorno del servidor **`WORKFLOW_API_KEY`** (ya existía en `.env.example` y
  `docker-compose.yml`; se reutiliza). Sin prefijo `VITE_`.
- Ruta `GET /api/workflow/preofertas`: `server/workflowPreofertas.js` (una sola función), `api/workflow/preofertas.js`
  (Vercel) y `server.ts` (local/Docker), igual que la de Prospekt. Reenvía la respuesta de Workflow **tal cual**, así
  las dos pantallas muestran lo mismo que antes.
- Sin variable o sin respuesta de Workflow: mensaje "No se pudieron cargar las preofertas" (sin detalles técnicos); el
  resto del dashboard sigue.
- En Activaciones solo se cambió la llamada (y el texto del error); nada más.
- La llave estuvo expuesta: hay que cambiarla (PENDIENTES).

## D3 · 18/11/2026 · «En proceso» igual que el correo diario
Se copió la regla de la función del correo (`InnovAIgt/Dashboard---flash-altas`, `supabase/functions/reporte-flash-publico`,
cambios del 16/11): **contar anexos (suma de `cantidad`), no solicitudes, y no contar renovaciones** (`RENOVACION`
como valor completo en `negocio` o `tipoContratacion`; «RENOVACION Y ADICION» sí cuenta). Siguen las reglas de antes:
`en_proceso`, sin B800, sin BACKUP y dentro del período. **Radicadas** = anexos dados de alta + anexos en proceso.
Se explica en pantalla: "En proceso = anexos en preoferta, sin renovaciones (igual que el correo diario)".
Se corrigió el comentario que decía "así coincide con el correo" (desde el 16/11 ya no coincidía).
La tabla «Radicaciones en proceso» del Informe sigue siendo una fila por solicitud, con su columna de anexos.

## D4 · 18/11/2026 · Ventas, Anexos y Unidades (regla de Ventas PROVISIONAL)
SAN manda **una fila por equipo** (casi todas con `CANTIDAD EQUIPO` = 1), por eso "Altas (anexos)" —que en realidad
contaba filas— salía casi igual que "Unidades". Ahora:
- **Ventas** = grupos de cliente + fecha + vendedor. ⚠ **PROVISIONAL** hasta que TI/SAN confirme si puede mandar el
  número de pedido o de preoferta de cada alta (PENDIENTES).
- **Anexos** = anexos distintos. **Unidades** = suma de equipos.
- Se eliminó el título "Altas (anexos)". "Contar por" tiene Ventas, Anexos y Unidades.
- **El dashboard abre contando por Anexos** (decisión de Keily, 18/11/2026), para que Ejecutivo × mes se vea con
  los colores del semáforo como en el diseño aprobado. Ventas sigue disponible con un clic.
- Donde antes decía "altas" ahora dice ventas y, junto, los equipos entregados ("12 ventas · 340 equipos").
- Una venta es *nueva* si tiene al menos una línea NUEVA (hoy solo 1 de 506 mezcla nuevas y adiciones).
- Las líneas con 0 equipos cuentan en Ventas y Anexos y suman 0 unidades (18/11: GT 152, SV 103).
- Todas las cifras (tarjetas, gráficas, matriz, tablas, PDF) salen de las mismas funciones `medir()` / `partir()`;
  los totales de la matriz se miden sobre sus filas (una venta no se cuenta dos veces).
- El **semáforo** de Ejecutivo × mes (50 / 20) se pensó para altas ≈ equipos: se aplica con Anexos y Unidades; con
  Ventas las celdas van sin color hasta que Ventas defina una meta (PENDIENTES).

## D6 · 18/11/2026 · Ingreso promedio por unidad (del diseño aprobado)
Se copió del prototipo, con la lógica del portal: **valor mensual de servicios (`valnet`) ÷ equipos entregados**,
por **grupo comercial = jefe** (`anajef`, se muestra «Grupo <jefe>») y por ejecutivo, con el promedio general.
Con tipo de cambio todo va en la moneda del interruptor $ / Q; sin él, cada país en su moneda (nunca se suman $ y Q).
Las líneas sin equipo (255 el 18/11) no entran. Dona por grupo (tajada = parte del valor mensual), barras por ejecutivo
con línea punteada del promedio y columna de equipos, y «Ver en tabla». También es un módulo del PDF.
Cifras del 18/11 (en dólares): promedio $17.24 · Cabrego $17.28 · Alexandra Londono $16.62 · Jjimenez $19.43 ·
Ejmendez $20.80 · Raul Ramirez $16.00. Ventas debe confirmar que «jefe» = grupo comercial (PENDIENTES).

## D7 · 18/11/2026 · Ejecutivos en 0
Del prototipo: en «Ventas por ejecutivo» y «Ejecutivo × mes» salen en 0 los ejecutivos que tienen altas en los datos
(con los filtros de país y ejecutivo) pero ninguna en el mes o período elegido. Los que nunca vendieron no están en los
datos: para ellos sigue faltando el catálogo de vendedores (PENDIENTES).

## D8 · 18/11/2026 · Que se vea completo en pantalla
Las tablas del Resumen (Ejecutivo × mes y las de «Ver en tabla») se muestran completas, sin cortarse con su propia
barra. En la barra de filtros, «Contar por» y PDF van juntos en la segunda fila. En pantallas de laptop (≤ 1280 px)
las 4 tarjetas de abajo van de 2 en 2 y la dona y las barras de ingreso, una debajo de la otra. Revisado a 1650, 1100 y
900 px: nada se sale a lo ancho (a 900 px solo la tabla Ejecutivo × mes se desplaza dentro de su caja).

## D9 · 18/11/2026 · Detalle al hacer clic en el ingreso promedio
Al hacer clic en una tajada o un nombre de la dona, en una barra de ejecutivo o en una fila de «Ver en tabla» se abre
una ventana con el detalle exacto, con los mismos filtros y moneda: promedio por unidad, diferencia contra el promedio
general, equipos (ventas · líneas) y valor mensual (% del total). Debajo, en tabla: para un **grupo**, sus ejecutivos
de mayor a menor promedio; para un **ejecutivo**, sus ventas (cliente + fecha) de la más reciente a la más antigua,
con equipos, valor mensual y promedio (verde = arriba del promedio general, amarillo = abajo). Se cierra con ×, Esc o
clic afuera. Los colores del semáforo de Ejecutivo × mes se reforzaron (el estándar dejaba el número en blanco).

## D10 · 18/11/2026 · Período por defecto: mes actual
El filtro **Período** abre siempre del **día 1 del mes actual a hoy** en **hora de Guatemala** (no depende de la zona ni la hora de la
computadora; así lo traía también `main`, commit 1cd71e9), no desde la primera
alta. El botón ↺ del período y «Volver a filtros por defecto» regresan a ese rango; si se borra una fecha, vuelve a la
de por defecto. Para ver meses anteriores se cambian las fechas a mano. Lo hace `periodoMesActual()` (con prueba).
El día 1 temprano, antes de que el robot traiga datos del mes, la pantalla puede salir vacía.

## D5 · 18/11/2026 · Sin copia de respaldo: si datos.json falla, mensaje claro
El HTML traía una copia de 3,987 altas del 05/10/2026 **con nombres de clientes**, y la usaba sola si `datos.json` no
respondía (mostraba datos de otro mes como si fueran de hoy). Por decisión de Keily (18/11/2026) **se quitó**.
Ahora, si `datos.json` no responde o viene vacío, la página muestra **"No se pudieron cargar las altas. Intenta más
tarde."**, sin datos viejos y sin detalles técnicos (quedan en la consola). Lo hace `obtenerAltas()`; lo prueba
`server/flashAltas/flashAltas.test.js`. La fuente `embebido` ya no existe en `CONFIG.FUENTE`.
