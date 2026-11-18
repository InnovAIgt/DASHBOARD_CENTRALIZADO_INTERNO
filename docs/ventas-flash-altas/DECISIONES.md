# Decisiones · Flash de altas

## D1 · 18/11/2026 · Gráficas de vendedores primero
Nuevo orden del Resumen, en pantalla y en el PDF: **Top 3 → Ventas por ejecutivo → Ejecutivo × mes → indicadores →
ventas por mes y por país**. Solo cambió el orden, no los cálculos.
En el PDF, la librería compartida (`public/assets/js/reporte-pdf.js`, que no se toca) siempre pone las tarjetas
primero; el Flash las mueve después de «Resumen por ejecutivo» en su paso propio de retoque (`pdfOrdenEjecutivoPrimero`
dentro de `pdfRetocar`) y renumera las secciones. El módulo «Ventas por ejecutivo» va primero en la ventana del PDF.
El PDF no tiene módulos de Top 3 ni de Ejecutivo × mes (no los tenía antes).

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
- Se eliminó el título "Altas (anexos)". "Contar por" tiene Ventas (por defecto), Anexos y Unidades.
- Donde antes decía "altas" ahora dice ventas y, junto, los equipos entregados ("12 ventas · 340 equipos").
- Una venta es *nueva* si tiene al menos una línea NUEVA (hoy solo 1 de 506 mezcla nuevas y adiciones).
- Las líneas con 0 equipos cuentan en Ventas y Anexos y suman 0 unidades (18/11: GT 152, SV 103).
- Todas las cifras (tarjetas, gráficas, matriz, tablas, PDF) salen de las mismas funciones `medir()` / `partir()`;
  los totales de la matriz se miden sobre sus filas (una venta no se cuenta dos veces).
- El **semáforo** de Ejecutivo × mes (50 / 20) se pensó para altas ≈ equipos: se aplica con Anexos y Unidades; con
  Ventas las celdas van sin color hasta que Ventas defina una meta (PENDIENTES).

## D5 · 18/11/2026 · Sin copia de respaldo: si datos.json falla, mensaje claro
El HTML traía una copia de 3,987 altas del 05/10/2026 **con nombres de clientes**, y la usaba sola si `datos.json` no
respondía (mostraba datos de otro mes como si fueran de hoy). Por decisión de Keily (18/11/2026) **se quitó**.
Ahora, si `datos.json` no responde o viene vacío, la página muestra **"No se pudieron cargar las altas. Intenta más
tarde."**, sin datos viejos y sin detalles técnicos (quedan en la consola). Lo hace `obtenerAltas()`; lo prueba
`server/flashAltas/flashAltas.test.js`. La fuente `embebido` ya no existe en `CONFIG.FUENTE`.
