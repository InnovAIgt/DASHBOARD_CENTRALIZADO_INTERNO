# Ventas · Flash de altas

Dashboard del área **Ventas** del portal (menú: Ventas → **Flash de altas**). Muestra las **ventas dadas de alta en SAN**
por ejecutivo, mes y país (El Salvador y Guatemala), y las **preofertas que siguen en proceso** en Workflow.

Es una página HTML que el portal muestra dentro de un recuadro (iframe):
`public/dashboards/ventas/flash-altas.html` (+ `public/assets/css/flashAltas.css`).

## Qué muestra

**Resumen**, en este orden (diseño aprobado, DECISIONES D1):
1. **Top 3 ejecutivos**
2. **Indicadores**: Ventas · En proceso · Radicadas, y debajo Unidades, Clientes, Valor mensual de servicios y % ventas nuevas
3. **Ventas por ejecutivo** (nuevas y adiciones; a la derecha «ventas · equipos eq.»; en ámbar, los anexos en proceso; en 0 los que no vendieron en el período)
4. **Ingreso promedio por unidad**: valor mensual ÷ equipos, por grupo comercial (jefe) y por ejecutivo, con «Ver en tabla» (D6)
5. **Ejecutivo × mes** (completa, con columna *En proceso*)
6. **Ventas por mes** y **Ventas por país**, lado a lado

**Informe detallado**: una línea por equipo (como la manda SAN), con buscador, Excel, CSV y PDF; y la tabla de
**Radicaciones en proceso** (preofertas de Workflow).

**Período**: abre del día 1 del mes actual a hoy (D10).

**Contar por** (arriba, en la barra): **Ventas** · **Anexos** (abre así, con el semáforo) · **Unidades (equipos)**.

En **Ingreso promedio por unidad**, un clic en la dona, una barra o una fila abre el detalle de ese grupo o ejecutivo (D9).

## Qué significa cada cifra

| Cifra | Qué cuenta |
|---|---|
| **Ventas** | Grupos de **cliente + fecha + vendedor**. ⚠ **Regla PROVISIONAL** (D4): SAN manda una fila por equipo y no trae el número de pedido; cuando TI confirme si SAN puede mandarlo, se cambia. Una venta es *nueva* si tiene al menos una línea NUEVA. |
| **Anexos** | Anexos distintos (`ANEXO` / `folcod`). |
| **Unidades (equipos)** | Suma de `CANTIDAD EQUIPO` (`cnteqp`). Las líneas con 0 equipos cuentan en Ventas y Anexos, pero suman 0 aquí. |
| **En proceso** | **Anexos** de las preofertas en curso en Workflow (suma de su columna `cantidad`), **sin renovaciones**, sin BACKUP y sin las que ya tienen el checklist B800. Es la misma regla que el **correo diario** desde el 16/11 (D3). |
| **Radicadas** | Anexos dados de alta + anexos en proceso (todo en anexos). |

Las líneas BACKUP (equipos de respaldo) no cuentan en nada.

## De dónde salen los datos

| Fuente | Cómo llega | Dónde está el código |
|---|---|---|
| **Altas de SAN** | Un robot en otro repositorio (`InnovAIgt/Dashboard---flash-altas`, `actualizar.js`, GitHub Actions) consulta `san.red.com.gt/flashApi/altas` con la llave `FLASH_API_KEY` y publica `datos.json` en GitHub Pages. La página lo lee. | Robot: repositorio aparte (no se toca desde aquí). Lectura: `cargarDatos()` en el HTML. |
| **Preofertas de Workflow** | La página pide `GET /api/workflow/preofertas` (ruta del portal). El servidor llama a Workflow con la llave **`WORKFLOW_API_KEY`** (solo servidor) y reenvía la respuesta tal cual. | `server/workflowPreofertas.js` · `api/workflow/preofertas.js` (Vercel) · `server.ts` (local/Docker). También la usa **Activaciones**. |
| **Tipo de cambio** | Banco de Guatemala (`VITE_FX_URL`). | `cargarTipoCambio()` en el HTML. |

Si Workflow no responde o falta la variable, la sección de preofertas dice **"No se pudieron cargar las preofertas"** y
el resto del dashboard sigue funcionando. Si `datos.json` no responde, la página dice **"No se pudieron cargar las
altas. Intenta más tarde."** (ya no usa una copia vieja guardada en el HTML).

## Configuración

- **`WORKFLOW_API_KEY`** (variable de entorno del servidor, **sin** `VITE_`): en Vercel (Preview y Production), en
  `.env.local` para local y en Docker (ya está en `docker-compose.yml`). Debe estar **antes** de publicar este cambio;
  si no, Flash de altas y Activaciones muestran "No se pudieron cargar las preofertas".
- `VITE_WORKFLOW_API_KEY` ya no se usa: no le pongas valor (todo lo que empieza con `VITE_` llega al navegador).

## Pruebas

```
node --test "server/**/*.test.js"
```
- `server/flashAltas/flashAltas.test.js`: usa el **código real de la página** con una copia fija de `datos.json`
  del 18/11/2026 **sin nombres de clientes** (`server/flashAltas/prueba/datos-fijos-2026-11-18.json`).
- `server/workflowPreofertas.test.js`: la ruta de preofertas (con y sin llave, con error de Workflow).

Pendientes: [PENDIENTES.md](PENDIENTES.md). Decisiones: [DECISIONES.md](DECISIONES.md).
