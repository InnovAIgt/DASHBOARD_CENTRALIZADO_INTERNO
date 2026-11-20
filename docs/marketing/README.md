# Marketing · Flujo de ventas (versión 2)

> Responsable: Keily García · Inicio: 11 de noviembre de 2026
> Estado: **integrado en `main`**. Está preparado el cambio para que el menú abra la v2; al
> integrarlo, el archivo anterior se conservará fuera del menú como respaldo. La carga de datos en
> Vercel requiere `RED_API_KEY` en el entorno correspondiente.

## ¿Qué es?

Es el dashboard que muestra cómo avanzan los **leads calificados** asignados a cada
vendedor, desde que se le asignan hasta que se cierran. Permite ver, por país y por
vendedor, en qué etapa está cada lead y en qué etapa se pierden.

Esta versión 2 reemplaza a `public/dashboards/marketing/flujo-ventas.html`. Se
reconstruye por los cambios que pidió el ingeniero en la reunión de seguimiento del
11/11/2026 (ver [REQUISITOS.md](REQUISITOS.md)).

## ¿De dónde salen los datos?

De la API de **Prospekt IA** (`/api/metrics/reuniones`), consultada **en vivo** cada vez
que alguien abre el dashboard. Es la misma API y la misma lógica que usa el repo
`InnovAIgt/DashboardLeads` (vista "Dashboard General").

```
 Navegador (la pantalla del dashboard)
     │  pide  /api/marketing/reuniones?offset=0   ← sin llave
     ▼
 Función del centralizado (Vercel)  →  api/marketing/reuniones.js
     │  agrega la llave RED_API_KEY (guardada en Vercel, nunca en el código)
     ▼
 Prospekt IA  →  https://prospektia.red.com.sv/api/metrics/reuniones
     │  responde con los leads en páginas de 50
     ▼
 La pantalla calcula los indicadores y dibuja las gráficas
```

**Por qué así:** la llave de Prospekt IA nunca llega al navegador (nadie la puede ver
con F12) y no hace falta un robot ni una base de datos para lo básico.

## Archivos de este módulo

| Archivo | Qué hace |
|---|---|
| `api/marketing/reuniones.js` | Función de Vercel: el "mesero" que llama a Prospekt IA con la llave escondida |
| `server/marketingReuniones.js` | La misma lógica, compartida para que también funcione en local (`npm run dev`); quita el teléfono del cliente antes de responder |
| `src/components/layout/PortalLayout.tsx` | Entrada "Flujo de ventas" del menú (MARKETING), conectada a la v2; el menú lateral se esconde solo en la v2 (se asoma al acercar el mouse al borde izquierdo) |
| `src/modulos/marketing/flujo-ventas-v2/FlujoVentasV2.jsx` | Pantalla principal: encabezado, filtros fijos y pestañas **Resumen** / **Ejecutivos** / **Informe detallado** |
| `src/modulos/marketing/flujo-ventas-v2/flujo-ventas-v2.css` | Estilos propios (tema oscuro basado en Activaciones), encerrados en `.fv2` |
| `src/modulos/marketing/flujo-ventas-v2/utils/`, `types/`, `hooks/`, `context/`, `services/` | **Lógica copiada** de InnovAIgt/DashboardLeads, sin cambios (carga de datos, filtros y cálculos) |
| `…/pantalla/datos.js` | Cálculos de la pantalla: período, conversión de calificados corregida, agrupaciones |
| `…/pantalla/VistaGeneral.jsx`, `graficas.jsx` | Pestaña Resumen: tarjetas por país, indicadores, "Leads por mes" y "Recorrido de los leads" |
| `…/pantalla/RecorridoLeads.jsx` | "Recorrido de los leads": las 6 etapas como rastreo de pedido (Resumen y ventana del ejecutivo) |
| `…/pantalla/Ejecutivos.jsx` | Pestaña Ejecutivos: fichas de coaching comparadas con el equipo (D17) |
| `…/pantalla/Tablas.jsx` | Tabla y tabla de leads que usan las ventanas |
| `…/pantalla/Filtros.jsx` | Barra de filtros (país, período, panel Filtros) |
| `…/pantalla/Ventanas.jsx` | Ventanas de detalle (indicadores, ejecutivo, mes y ficha del lead) |
| `…/pantalla/comunes.jsx` | Piezas visuales comunes (banderas, insignias, avisos) |
| `…/pantalla/Informe.jsx` | Pestaña Informe detallado: vistas rápidas, tabla, buscador, orden, páginas |
| `…/pantalla/Semaforo.jsx` | Píldora de la próxima gestión con semáforo (informe y ventana de etapa) |
| `…/pantalla/informeDatos.js` | Columnas del informe (campos de la API por grupo), vistas rápidas y semáforo |
| `…/pantalla/excel.js` | Botón "Descargar Excel": misma plantilla y método que el Excel de Activaciones |
| `…/pantalla/pdf.js` | Botón "PDF": carga la herramienta compartida del portal (`dashboard-pdf.js`) y arma el reporte con la plantilla de Activaciones |
| `docs/marketing/` | Esta documentación |

## Pestañas

Debajo de los filtros: **Resumen** (tarjetas por país, 2 indicadores —Conversión de calificados
y Unidades vendidas—, "Leads por mes" y "Recorrido de los leads") · **Ejecutivos** (tarjetas por ejecutivo) · **Informe detallado**. La zona de filtros
y pestañas queda fija arriba: la v2 se desplaza dentro de su propio contenedor (alto de la
pantalla menos la barra del portal). La pestaña elegida se recuerda mientras la página esté abierta.

- Clic en cualquier dato de una tarjeta de país (conversión, Total leads, Calificados, Ganados,
  Unidades por cierre) → Detalle de leads de ese dato, solo con los leads de ese país.
- Clic en un mes de "Leads por mes" → Detalle mensual de ese mes con el filtro de país actual.
- **Ejecutivos:** fichas de ancho completo ordenadas para coaching. Cada ficha compara citas,
  propuestas y ganados del vendedor con el equipo (ambos países, mismo período y tipo de lead);
  muestra su avance por etapa, brecha principal, seguimientos vencidos, acciones y ranking de
  ventas. Clic en un paso o acción → detalle del ejecutivo con los leads correspondientes.
  Los ejecutivos sin leads en el período aparecen en una franja aparte. El PDF conserva su tabla
  actual de ejecutivos (D17).

## Descarga en PDF

Botón rojo **PDF** junto a la barra de filtros (visible en las 3 pestañas). Abre la misma ventana
de Activaciones ("¿Qué módulos deseas incluir?") con los filtros aplicados en chips y 3 módulos:
**01 Resumen** (países, indicadores, leads por mes y embudo por etapa), **02 Ejecutivos** (una
fila por ejecutivo, incluidos los de 0, y total del equipo) y **03 Informe detallado** (la vista
rápida y la búsqueda elegidas en la pestaña Informe; 10 columnas; máximo 300 filas, el detalle
completo está en el Excel). Archivo: `Reporte_flujo_ventas_<GT|SV|GT-SV>_<desde>_<hasta>.pdf`.

- Usa **tal cual** la herramienta compartida del portal: `public/assets/js/dashboard-pdf.js`,
  `dashboard-pdf-logo.js` y `public/assets/css/dashboard-pdf.css`. La v2 los agrega a la página
  una sola vez al abrirse y llama a `window.DashboardPdf.openModulePicker`, como Activaciones.
- Nunca incluye el teléfono del cliente. Rojo en el contenido solo para lo vencido.

## Filtros por defecto

Al abrir: todos los países, **Tipo de lead = Calificado** y **Período = del día 1 del mes
hasta hoy**.

## Recorrido de los leads (pestaña Resumen, DECISIONES D16)

Seis círculos unidos por una línea (Asignación → Reunión → Demo → Envío de propuesta →
Seguimiento → Cierre). Sobre cada tramo: "−X · Y % pasa", con color según el % de paso (verde
≥ 75 %, gris 60–74 %, amarillo < 60 %; punteado = pocos datos, menos de 5 leads). Debajo de cada
etapa: leads que llegaron, % del total, cuántos esperan hoy ahí y "Mejor: ★ ejecutivo · xx %".
Arriba: entraron · en camino (abiertos hoy) · cerrados (ganados). El tramo donde más se frena
(menor % con al menos 5 leads) va resaltado en amarillo, con un aviso. Respeta los filtros.
Componente: `pantalla/RecorridoLeads.jsx`; datos: `recorridoLeads()` en `pantalla/datos.js`.
También se usa en "Avance por etapa" de la ventana del ejecutivo (sin "Mejor").

- **Etapa estimada** (DECISIONES D13): los leads perdidos se ubican en la última etapa con
  datos registrados por el vendedor; los ganados llegan a Cierre; los abiertos están en su
  etapa actual.
- **Mejor en cada etapa:** el ejecutivo con mayor % de paso de esa etapa a la siguiente (en
  Cierre, % que se ganó), contando solo a quienes tienen al menos 5 leads en ella.
- Clic en una etapa → ventana con llegaron, % que pasó a la siguiente, están hoy aquí (y
  cuántos con gestión vencida) y el mejor ejecutivo, más las pestañas **Por mes**,
  **Por ejecutivo** y **Leads en esta etapa**.

## Regla de colores de los datos (DECISIONES D12)

| Color | Para qué |
|---|---|
| Rojo `#c43c50` | Solo lo crítico: seguimientos vencidos y próxima gestión vencida |
| Amarillo `#c59600` | Atención: etapa con la mayor caída, % de paso bajo (< 60 %), gestión para hoy, perdidos sin motivo |
| Verde `#2f8f76` | Va bien: % de paso ≥ 75 %, ganados, gestión a tiempo |
| Azul `#4f8fd8` / gris | Información neutral: calificados, % normales (60–74 %), perdidos |

Los límites (60 % y 75 %) están en `LIMITES_PASO` (`pantalla/datos.js`) y son provisionales.
El rojo de la marca del portal (botones activos, pestañas, Excel, títulos pequeños, aviso de
consulta) y el error de conexión no cambian.

## Informe detallado

Pestaña con todo el detalle de cada lead, respetando los filtros de arriba (país, período,
ejecutivo y tipo de lead).

- **Vistas rápidas:** Todos · Pipeline abierto · Ganados · Perdidos · Seguimientos vencidos
  (lead abierto con la próxima gestión antes de hoy) · Sin motivo de pérdida.
- **Columnas por grupo** (se muestran u ocultan con "Columnas"): Cliente, Responsable,
  Calificación, Avance, Fechas, Propuesta, Resultado y Comentarios (oculto por defecto).
  Qué campo de la API va en cada columna y cuáles quedan fuera: [DECISIONES.md](DECISIONES.md), D11.
- **Semáforo de la próxima gestión** (solo leads abiertos): rojo = vencida, amarillo = hoy,
  verde = a tiempo.
- Buscador, orden al hacer clic en cualquier encabezado, 50 filas por página y clic en una fila
  para abrir la ficha.
- **Descargar Excel:** descarga lo que se ve (vista rápida, filtros, búsqueda y columnas
  visibles) con la plantilla del Excel de Activaciones: hoja "Informe detallado" y hoja
  "Filtros aplicados". ExcelJS 4.4.0 se carga desde el CDN solo al pulsar el botón (no está en
  `package.json`); si no carga, se descarga un CSV. Nombre:
  `Informe_flujo_ventas_<GT|SV|GT-SV>_<desde>_<hasta>.xlsx`. Incluye el nombre del cliente y
  nunca el teléfono.

## Configuración necesaria

| Variable | Dónde | Para qué |
|---|---|---|
| `RED_API_KEY` | Vercel → Settings → Environment Variables (y `.env.local` para trabajar en local) | Llave de la API de Prospekt IA |

⚠️ **Nunca** ponerle el prefijo `VITE_`: todo lo que empieza con `VITE_` se mete dentro
de la página y cualquiera lo puede ver.

## Cómo probar la conexión

Con el proyecto corriendo (`npm run dev` en local, o en una versión de prueba de Vercel),
abrir:

```
/api/marketing/reuniones?offset=0
```

- Si responde una lista de leads → la conexión funciona.
- Si dice `RED_API_KEY no está configurada` → falta guardar la llave.
- Si responde `502` → Prospekt IA no contestó.

## Documentos relacionados

- [REQUISITOS.md](REQUISITOS.md) — lo que pidió el ingeniero y si se puede hacer.
- [DECISIONES.md](DECISIONES.md) — cada decisión tomada, con fecha y motivo.
- [BITACORA.md](BITACORA.md) — qué se hizo en cada paso.
- [RETIRO_VERSION_ANTERIOR.md](RETIRO_VERSION_ANTERIOR.md) — cómo se retira el dashboard viejo sin romper nada.
