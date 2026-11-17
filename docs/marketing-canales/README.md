# Marketing · Marketing por canales

> Responsable: Keily García · Inicio: 16 de noviembre de 2026
> Rama: `feature/marketing-mailing` · Estado: **Fase 3 (pantalla de Mailing)**. Falta la prueba de
> Drive con la llave real. Redes sociales y Otros: pendientes de fuente de datos (no se muestran).

## La pantalla

Menú **MARKETING → Marketing por canales** (`src/modulos/marketing/canales/`, estilos con prefijo `mkt-`).
Es **una sola vista, sin pestañas**, con el formato del mockup aprobado, que sigue al dashboard original
"Campañas de correo" (D31). En este orden:

1. **Encabezado:** "Marketing · Mailing", título "Campañas de correo" y botón rojo **Actualizar** (`?actualizar=1`).
2. **Barra de filtros:** selector **"Sin internos (oficial)" / "Total en Brevo"**, **Período** (fecha de envío),
   **Filtros** (cargo: el único filtro de cargo, D32) y **Limpiar filtros**. Debajo, "Mostrando X correos
   de N campañas · … · última lectura".
3. **Transparencia de datos:** archivos leídos, correos analizados y exclusiones, con "Ver desglose de exclusiones".
4. **Filtro de campañas:** chips, "Seleccionar todas" y "Limpiar selección".
5. **Resumen del mes:** campañas del mes vs meta (meta pendiente) y leads generados y calificados
   (pendiente: Prospekt IA no guarda el correo del lead).
6. **Métricas de interacción:** 4 anillos (Entrega, Apertura, CTR y CTOR) con Excelente / Promedio / Bajo
   y sus rangos (D26).
7. **Salud del envío:** 6 tarjetas (entregados, rebote permanente, rebote temporal, apertura automática,
   bajas y quejas). Solo entregados + rebotes suman el 100 %.
8. **Mejor campaña, mejor cargo, peor entrega y mejor país** (D30).
9. **Aperturas por cargo** y **Evolución por mes.**
10. **Embudo de conversión.**
11. **Ranking de campañas.** Ordenado por % de apertura, con la casilla "solo muestra suficiente". Al hacer
    clic en una fila se abre la **ventana de detalle**.

"¿Cómo se calcula cada número?" va plegado al final.

- **Filtros (D29):** el período, el cargo y los chips eligen campañas, y el servidor recalcula
  (`?campanas=`). La pantalla no recalcula métricas.
- **No incluye:** pestañas, Comparar campañas, Redes sociales, Otros, Lead Scoring, Embudo comercial,
  Pipeline ni nada por empresa (D24, D31).
- **Colores** (D22, D26, D31):
  - rojo solo para lo crítico;
  - amarillo = atención o bajo;
  - azul = promedio;
  - verde = bien o excelente;
  - gris = pendiente o pocos datos.
- Las explicaciones de la pantalla vienen del servidor (`reglas.definiciones`), así que siempre
  coinciden con el cálculo.

| Archivo | Qué hace |
|---|---|
| `MarketingCanales.jsx` | Vista única: estado de los filtros y carga de datos (`?campanas=`). |
| `servicios/api.js` | Llama a `/api/marketing/mailing`. |
| `pantalla/datos.js` | En un solo lugar: semáforo (`UMBRALES`), rangos de los anillos (`REFERENCIAS`), metas (`METAS`), muestra (`MUESTRA`), filtros, formatos y fechas. |
| `pantalla/Mailing.jsx` | La vista en el orden del mockup: resumen, salud, destacados, ranking, ¿cómo se calcula? |
| `pantalla/Filtros.jsx` | Barra de filtros, línea de resumen, transparencia de datos y filtro de campañas. |
| `pantalla/Interaccion.jsx` | Anillos (SVG dibujado a mano). |
| `pantalla/Graficas.jsx` | Aperturas por cargo, evolución por mes y embudo (dibujados a mano). |
| `pantalla/DetalleCampana.jsx` | Ventana con el detalle de una campaña. |
| `pantalla/comunes.jsx` | ⓘ explicación, pastilla del semáforo, "pocos datos", avisos. |
| `marketing-canales.css` | Estilos encerrados en `.mkt` y `.mkt-ventana`, con los valores del estándar del portal. |

## ¿Qué es?

Un dashboard nuevo del área de Marketing que mide los resultados por **canal**. El primer canal
es **Mailing** (campañas de correo enviadas con Brevo). Redes sociales y Otros vendrán después
("Pendiente de fuente de datos").

Es un módulo distinto del **Flujo de ventas** (no se mezclan) y del dashboard viejo
**"Campañas de correo"** (`mailing-campanas.html`), que no se toca (ver D13).

## Cómo está armado: 3 piezas separadas (D1)

```
 1. FUENTE                     2. CÁLCULOS                  3. RUTA y PANTALLA
 (de dónde salen los datos)    (qué significan)             (qué se muestra)
 ───────────────────────────   ─────────────────────────    ──────────────────────────
 Carpeta local (hoy)      ┐
 Google Drive (Fase 2)    ├─▶  filas estándar  ─▶  calculos.js  ─▶  /api/marketing/mailing
 Base de datos/API (futuro)┘   (1 por persona               (solo totales, sin datos
                               por campaña)                  personales) ─▶ pantalla
```

Cambiar la fuente **no** obliga a tocar los cálculos ni la pantalla.

| Archivo | Pieza | Qué hace |
|---|---|---|
| `server/marketingCanales/fuenteDrive.js` | Fuente | Lee la carpeta de Google Drive, con caché de 15 min. |
| `server/marketingCanales/googleAuth.js` | Fuente | Pide a Google el permiso de solo lectura con la cuenta de servicio. |
| `server/marketingCanales/fuenteLocal.js` | Fuente | Lee la carpeta de `MARKETING_LOCAL_CSV_DIR`. |
| `server/marketingCanales/errorFuente.js` | Fuente | Errores de fuente con mensajes claros (sin llaves ni rutas). |
| `server/marketingCanales/combinarArchivos.js` | Fuente | Junta todos los CSV; si una campaña se repite, usa el archivo más reciente. |
| `server/marketingCanales/brevoCsv.js` | Fuente | Convierte un CSV de Brevo a filas estándar. |
| `server/marketingCanales/reglas.js` | Cálculos | **Lista editable**: campañas de prueba, dominios internos, país, mínimo de datos. |
| `server/marketingCanales/calculos.js` | Cálculos | Métricas por campaña, por mes, totales y exclusiones. |
| `server/marketingMailing.js` | Ruta | Une fuente + cálculos y arma la respuesta (con candado de privacidad). |
| `api/marketing/mailing.js` | Ruta | Versión para Vercel. |
| `server.ts` | Ruta | La misma ruta en local y en Docker/Coolify. |

## ¿De dónde salen los datos?

De una carpeta con los reportes "por persona" que se descargan de Brevo (un CSV por campaña).
La carpeta es el **historial**: se leen todos los CSV y se acumulan. Hay dos fuentes posibles:

| Fuente | Variables | Dónde sirve |
|---|---|---|
| **Google Drive** (oficial) | `GOOGLE_SERVICE_ACCOUNT_JSON` + `MARKETING_DRIVE_FOLDER_ID` | Local, Vercel y Docker. Guía: [CONFIGURAR_DRIVE.md](CONFIGURAR_DRIVE.md) |
| Carpeta local | `MARKETING_LOCAL_CSV_DIR` | Solo en la computadora de desarrollo |

Si están las dos, **gana Drive** (D15). Drive se guarda 15 minutos; `?actualizar=1` lo vuelve a leer (D17).

- La campaña se reconoce por la columna **Campaign ID**, no por el nombre del archivo.
- Si dos CSV traen la misma campaña, se usa el de **fecha de modificación más reciente**.
- No se leen subcarpetas ni archivos que no sean `.csv`. La respuesta dice cuáles se ignoraron y por qué.

Los CSV tienen datos personales: **nunca se suben al repositorio** (`.gitignore`) ni entran en la
imagen de Docker (`.dockerignore`).

## Cómo se calcula (por campaña)

**Estado final de cada persona (D21): gana el ÚLTIMO evento con fecha.** Se comparan las fechas de
entrega, rebote temporal (Soft_Bounce) y rebote permanente (Hard_Bounce), y cada persona queda en un
solo estado. Si un rebote tiene la misma hora que la entrega, o una fecha no se entiende, gana el rebote.
Así, **enviados = entregados + rebotes temporales + rebotes permanentes + sin estado**.

| Métrica | Regla |
|---|---|
| Enviados | Filas del reporte (una persona por fila; si un correo se repite, cuenta una vez). |
| Entregados | Lo último que pasó fue la entrega. Es la base de los porcentajes, igual que en Brevo. |
| Rebotes temporales | Lo último que pasó fue un rebote temporal, aunque antes se haya entregado. |
| Rebotes permanentes | Lo último que pasó fue un rebote permanente. |
| Entregados y luego rebotados | Tenían entrega, pero después rebotaron. Ya están en los rebotes; es informativo. |
| Sin estado | Sin fecha de entrega ni de rebote. |
| Aperturas reales | Tiene fecha de apertura (Open_Date), aunque después haya rebotado. |
| Aperturas de rebotados | Abrieron y luego terminaron en rebote. Están dentro de las aperturas reales. |
| Solo apertura automática | Sin fecha de apertura y con aperturas de Apple (MPP) > 0. **No cuenta como real.** |
| Personas con clic | Clicked_Links_Count > 0. |
| Aperturas totales (incluye repetidas y automáticas) | Suma de Total Opens. **No coincide con la pantalla de Brevo**, que usa otra fórmula. |
| Clics en enlaces distintos | Suma de Clicked_Links_Count. **No coincide con la pantalla de Brevo**, que usa otra fórmula. |
| % apertura | Aperturas reales ÷ entregados. Si alguien abrió y luego rebotó, `notaPctApertura` lo dice con el número calculado, por ejemplo: "Incluye 4 personas que abrieron el correo y luego tuvieron un rebote temporal". |
| % clic | Personas con clic ÷ entregados. |
| Bajas / Quejas | Tienen fecha de baja / de queja (spam). |

Con **menos de 5 entregados** los porcentajes no se calculan: "pocos datos".

### Números de control (3 CSV de noviembre)

| "Total en Brevo" | #74 | #75 | #76 | Total |
|---|---|---|---|---|
| Enviados | 169 | 371 | 314 | **854** |
| Entregados | 157 | 308 | 254 | **719** (los mismos que usa Brevo para sus %) |
| Rebotes temporales | 12 | 37 | 33 | **82** |
| Rebotes permanentes | 0 | 26 | 27 | **53** |
| Entregados y luego rebotados | 1 | 6 | 3 | **10** |
| Aperturas reales | 28 | 62 | 57 | **147** |
| Personas con clic | 1 | 5 | 6 | **12** |

"Sin internos" (cifra oficial) solo cambia en la #76, que tiene 1 correo interno de RED con entrega,
apertura y clic: quedan 313 enviados, 253 entregados, 56 aperturas reales y 5 personas con clic.

Cada campaña trae dos bloques:
- **`totalBrevo`**: todas las filas, para comparar con Brevo.
- **`metricas`**: **sin correos internos de RED**. Es la cifra oficial: porcentajes, meses y totales (D5).

**Exclusiones** (se cuentan y se muestran aparte, ver `reglas.js`):
- **Campañas de prueba**: el nombre contiene `[VALIDACIÓN]`, `[PRUEBA]`, `[TEST]`, `MARKETING TEST` o `TEST`
  como palabra completa, sin importar mayúsculas ni tildes. No entran en meses ni totales.
- **Destinatarios internos**: `red.com.gt`, `red.com.sv`, `redintelfon.com` (dominio exacto o subdominio).
- **País**: `.gt` = Guatemala, `.sv` = El Salvador; lo demás = Desconocido (no se adivina).
- **Mes** de una campaña = mes de su primera fecha de envío.

## La ruta `/api/marketing/mailing`

`GET` (opcional `?actualizar=1`) devuelve JSON con:
- `fuente`: cuál se usó (`tipo`, `descripcion`, `nota`), si está configurada y, en Drive, la caché
  (cuándo se leyó y cuándo vence).
- `archivos`: cuántos se revisaron, cuáles se usaron (campañas y filas) y cuáles se ignoraron, con motivo.
- `campanas`: id, nombre, fecha de envío, mes, si está excluida y por qué, `totalBrevo`, `metricas`,
  `porPais` e internos.
- `meses` y `totales`: solo campañas que cuentan, sin internos.
- `exclusiones`: campañas de prueba e internos.
- `reglas`: patrones, dominios, mínimo de datos y la definición de cada métrica (para explicarla en pantalla).

**Privacidad:** no envía correos, IPs ni datos de personas. Si por error algún texto trajera un
correo, la ruta bloquea la respuesta (D11).

Sin ninguna fuente configurada responde `200` con `fuente.configurada = false` y el mensaje
"Fuente de datos no configurada" (D12).

## Variables de entorno (solo servidor, sin `VITE_`)

| Variable | Dónde | Para qué |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `.env.local`, Vercel y Coolify | Llave de la cuenta de servicio (JSON o base64). **Secreta.** |
| `MARKETING_DRIVE_FOLDER_ID` | `.env.local`, Vercel y Coolify | Código de la carpeta de Drive. |
| `MARKETING_LOCAL_CSV_DIR` | `.env.local` en tu computadora | Ruta de la carpeta local con los CSV de Brevo. |

## Cómo probarlo en local

1. En `.env.local`, define `MARKETING_LOCAL_CSV_DIR` con la carpeta de los CSV.
2. Ejecuta `& "C:\Program Files\nodejs\npm.cmd" run dev`.
3. Abre `http://localhost:3000/api/marketing/mailing` en el navegador.

## Más documentos

- [REQUISITOS.md](REQUISITOS.md): lo pedido y su estado.
- [DECISIONES.md](DECISIONES.md): decisiones D1, D2…
- [CONFIGURAR_DRIVE.md](CONFIGURAR_DRIVE.md): cómo crear la cuenta de servicio y conectar la carpeta de Drive.
- [BITACORA.md](BITACORA.md): qué se hizo en cada fase y cambios solicitados.
