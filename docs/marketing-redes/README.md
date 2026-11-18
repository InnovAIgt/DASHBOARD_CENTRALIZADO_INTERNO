# Marketing · Redes sociales

Dashboard del área **Marketing** del portal (menú: Marketing → **Redes sociales**). Muestra las
publicaciones de redes sociales **hechas o programadas**, por **marca** y por **país**, y sus resultados
en **leads totales, calificados y no calificados**, con la meta de **14 publicaciones por marca al mes**.

Marcas: **RED Guatemala** (GT), **RED El Salvador** (SV) y **Datared** (SV, marca de negocio distinta a RED El Salvador).

Referencia visual aprobada: [`mockup/Mockup-Dashboard-Redes-sociales.pdf`](mockup/Mockup-Dashboard-Redes-sociales.pdf)
(página 1 = Resumen, página 2 = Informe detallado).

## Qué muestra

**Encabezado y filtros** (mismo diseño y posición que los demás dashboards, DECISIONES D23): pastilla "Actualizado" (al pasar el mouse: fecha de la copia y de la última publicación);
caja FILTROS con País (Todos / GT / SV), Período (fechas desde–hasta), "Filtros ▾" (Marca y Red, varias a la vez) y botón **PDF**
(ventana "¿Qué módulos deseas incluir?": Resumen e Informe detallado). Debajo, las pestañas *Resumen* e *Informe detallado*.
Los filtros afectan a las dos pestañas, al PDF y al Excel.

**Resumen** (sin avisos amarillos; esos viven en el Informe):
1. 6 indicadores: Publicaciones (hechas · programadas), Leads, Calificados, Cierres (+ unidades),
   Pauta invertida (con desglose por marca) y Costo por lead calificado (con la fórmula visible).
2. Meta de 14 al mes: cuadrícula marca × mes. Verde = cumplió · amarillo = faltan N · gris = sin posts,
   primer mes de la marca ("inicio") o mes en curso ("en curso · van N").
3. Leads por mes: columnas calificados + no calificados, total y cierres encima. "sin datos" si ningún
   resultado del mes está cargado.
4. Resultados por país (El Salvador = RED El Salvador + Datared) con fila de Total. Clic en un país = filtra todo.
5. Resultados por marca: tarjeta por marca. Clic = filtra todo.
6. Facebook vs. Instagram: alcance y leads por red y una nota calculada con los datos.

**Informe detallado:** una fila por publicación y red, buscador, vistas (Más leads · Más recientes ·
Sin métricas · Incompletas · ⚠ A revisar), paginación, botón **Descargar Excel** (exporta lo filtrado),
ficha de la publicación al hacer clic (todos sus datos, advertencias y link real) y la explicación de los estados.

Todo número se puede cliquear y abre la lista de filas que lo forman. Cada cálculo se explica con ⓘ o con un subtexto.

## De dónde salen los datos HOY

Del Excel de métricas de Marketing (*Plantilla_Metricas_Publicaciones_RRSS*), copiado en el proyecto:

```
server/marketingRedes/datos/metricas-rrss.xlsx   ← el Excel
server/marketingRedes/datos/info.json            ← { "actualizado": "AAAA-MM-DD", "origen": "…" }
```

El servidor lo lee en `server/marketingRedes/fuente.js` → `obtenerArchivoRRSS()`, lo limpia y entrega las filas
en `GET /api/marketing/redes`. El resultado queda en memoria 10 minutos (caché) para no leer el Excel en cada visita.

- **Local / Docker:** la ruta la atiende `server.ts`. El Dockerfile ya copia toda la carpeta `server/`.
- **Vercel:** la atiende `api/marketing/redes.js`. El Excel viaja con la función gracias a
  `"includeFiles": "server/marketingRedes/datos/**"` en `vercel.json`.
- Si el archivo no existe o está dañado, el dashboard muestra **"No hay datos de Redes sociales disponibles"**
  (sin errores técnicos).

> ⚠ El repositorio es **público** y el Excel real está en él, por decisión de Keily (17/11/2026). Ver DECISIONES, D4.

## Cómo actualizar la copia (mientras no exista el servicio automático)

1. Descarga el Excel en línea de Marketing (Archivo → Guardar como → Descargar una copia).
2. Reemplaza `server/marketingRedes/datos/metricas-rrss.xlsx` con ese archivo (mismo nombre).
3. En `server/marketingRedes/datos/info.json` cambia `"actualizado"` a la fecha de hoy (AAAA-MM-DD).
4. Corre las pruebas (`node --test "server/marketingRedes/**/*.test.js"`). **Ojo:** `real.test.js` compara contra
   las cifras de noviembre de 2026; con un Excel nuevo esas cifras cambian y hay que actualizarlas en la prueba.
5. Haz un PR con los dos archivos. Al publicarse, el dashboard muestra los datos nuevos.

## Advertencias que detecta (solo en el Informe detallado: ⚠ por fila; las del archivo completo no se muestran, D24)

| Regla | Ejemplo real |
|---|---|
| Calificados mayor que leads | SV 09/07 Facebook: 0 leads y 6 calificados |
| El mismo link en publicaciones distintas | Datared IG 16/07 y 22/07; GT 01/08 (FB e IG) con links de SV |
| El mismo link en la fila de Facebook y en la de Instagram | SV 30/04 |
| Link de Facebook en fila de Instagram (o al revés) | — (hoy no hay casos fuera del anterior) |
| Fila sin red social | 20 filas de SV, ago–sep |
| Costo del Excel distinto al recalculado | 21 casos; "Costo x Lead" suele estar dividido entre calificados |
| Fila de TOTAL que no cuadra con la suma real | Pauta de GT ($40 vs $70), SV ($232.50 vs $352.50) y Datared ($0 vs $20) |

Además se avisan las celdas que no son número, las fechas no reconocidas, las hojas desconocidas y las columnas faltantes.

## Cómo debe llenar Marketing el Excel

- **Una fila por publicación y por red** (Facebook e Instagram del mismo post = 2 filas con la **misma fecha, el mismo id y la misma Campaña**).
- **Siempre llenar `id`** (o, si no hay id, usar exactamente el mismo texto de Campaña en las dos filas).
- **Red social** siempre llena: `Facebook` o `Instagram`.
- **Link**: el de esa red (el de Instagram en la fila de Instagram). Copiarlo de la publicación, no del aviso de Facebook (`l.facebook.com/...`).
- **Números como números**: `5800`, no `5,8 mil`; `30`, no `$30,00`. Una celda escrita como texto no la suma la fila de total del Excel.
- **Vacío = no se sabe; 0 = fue cero.** No escribir `-` si el valor es 0.
- **Leads ≥ calificados** siempre.
- Los costos no hace falta llenarlos: el dashboard los calcula con la pauta.
- No agregar hojas nuevas sin avisar (el dashboard solo lee "Métricas RRSS GT", "Métricas RRSS SV" y "Métricas RRSS DATA RED").

## Cómo conectar el servicio automático (futuro)

Hoy la copia del Excel se actualiza a mano. Para leer directamente el Excel en línea (Microsoft 365):

**Qué cambiar — SOLO esto:** el cuerpo de `obtenerArchivoRRSS()` en `server/marketingRedes/fuente.js`.
Debe seguir devolviendo `{ bytes, actualizado, origen }`:
1. Pedir un token a Microsoft Entra ID con *client credentials* (`https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`, scope `https://graph.microsoft.com/.default`).
2. Descargar el archivo con Microsoft Graph: `GET /drives/{drive-id}/items/{item-id}/content` → `bytes`.
3. Leer `lastModifiedDateTime` del mismo item (`GET /drives/{drive-id}/items/{item-id}`) → `actualizado` (AAAA-MM-DD).
4. `origen: 'Excel en línea de Marketing (Microsoft 365)'`.
5. Si algo falla, lanzar `ErrorFuenteRRSS` con un mensaje claro (el dashboard ya muestra el aviso sin detalles técnicos).

**Permisos a pedir a TI:**
- Un *App registration* en Microsoft Entra ID para este portal, con permiso de aplicación de **Microsoft Graph**.
- Preferible **`Sites.Selected`** (solo el sitio de SharePoint donde vive el Excel) con *admin consent*, y que TI le dé
  permiso de **lectura** a ese sitio. Alternativa más amplia (no recomendada): `Files.Read.All`.
- Un *client secret* (o certificado) con fecha de vencimiento anotada.

**Variables de entorno** (solo servidor, nunca con prefijo `VITE_`; en `.env.local` y en Vercel):
`MS365_TENANT_ID`, `MS365_CLIENT_ID`, `MS365_CLIENT_SECRET`, `MS365_RRSS_DRIVE_ID`, `MS365_RRSS_ITEM_ID`.

**Qué NO hay que tocar:** el lector (`lector.js`, `numeros.js`, `links.js`), las advertencias (`advertencias.js`),
los cálculos (`src/modulos/marketing/redes/logica/calculos.js`), las pantallas, la ruta (`server/marketingRedes.js`,
`api/marketing/redes.js`, `server.ts`) ni las pruebas (salvo agregar una de la nueva fuente).
Cuando la nueva fuente funcione se pueden borrar `server/marketingRedes/datos/` y el bloque `functions` de `vercel.json`.

## Archivos

```
server/marketingRedes.js                 ruta: fuente → lector → advertencias (+ caché)
server/marketingRedes/fuente.js          ÚNICO lugar que sabe de dónde sale el Excel
server/marketingRedes/lector.js          hojas, columnas, filas de total, fechas, redes, publicación
server/marketingRedes/numeros.js         limpieza de números ("5,8 mil", "$30,00", "12.400"…)
server/marketingRedes/links.js           link real de l.facebook.com, red del link, clave para comparar
server/marketingRedes/advertencias.js    reglas de "datos a revisar"
server/marketingRedes/datos/             Excel real + info.json
server/marketingRedes/ejemplo/           Excel pequeño de ejemplo (datos inventados) y su generador
server/marketingRedes/*.test.js          pruebas
api/marketing/redes.js                   función de Vercel
src/modulos/marketing/redes/             pantalla (MarketingRedes.jsx, pantalla/, logica/, servicios/, css)
```

## Pruebas

```
node --test "server/marketingRedes/**/*.test.js"   # 36 pruebas: limpieza, links, ejemplo, Excel real, fuente
npm run lint                                        # tsc --noEmit
npm run build
```
