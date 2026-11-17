# Decisiones · Marketing por canales

Cada decisión con su fecha, qué se decidió y por qué.

## D1 · 16/11/2026 · Tres piezas separadas

**Decisión:** el módulo se arma en 3 piezas independientes:
1. **Fuente de datos**: entrega filas en un formato estándar interno. Hoy es la carpeta local
   (`fuenteLocal.js`). En la Fase 2 será Google Drive y en el futuro, una base de datos o una API.
2. **Cálculos** (`calculos.js`): toma las filas estándar y calcula las métricas sin saber de dónde vienen.
3. **Ruta `/api/marketing/mailing` y pantalla**: solo usan los resultados de los cálculos.

**Por qué:** cambiar de fuente (carpeta → Drive → base de datos) no debe obligar a tocar los
cálculos ni la pantalla.

## D2 · 16/11/2026 · Formato estándar: una fila por persona por campaña

**Decisión:** la fila estándar trae canal, id y nombre de la campaña, correo (solo en el servidor),
fecha de envío y si hubo entrega, apertura, rebote duro o suave, baja y queja, más los conteos de
aperturas, aperturas de Apple y clics. El lector del CSV de Brevo (`brevoCsv.js`) y el que junta
archivos (`combinarArchivos.js`) **no dependen de la carpeta**: Drive los reutilizará.
**Por qué:** la fuente solo describe hechos; las reglas de negocio viven en los cálculos.

## D3 · 16/11/2026 · La campaña se identifica por Campaign ID; la carpeta es el historial

**Decisión:** se leen todos los CSV y se acumulan. La campaña se reconoce por la columna
Campaign ID, nunca por el nombre del archivo. Si dos archivos traen la misma campaña, se usa el
de fecha de modificación más reciente; el otro aparece como ignorado y se explica por qué.
**Por qué:** los nombres de archivo de Brevo cambian y no son confiables.

## D4 · 16/11/2026 · Reglas de cálculo

**Decisión:** son las reglas de la tabla "Cómo se calcula" del [README](README.md). En resumen:
- entregados = entrega y sin rebote duro;
- rebote suave = rebote suave y sin entrega;
- aperturas reales = Open_Date;
- la apertura automática de Apple no cuenta como real;
- los porcentajes van sobre entregados;
- con menos de 5 entregados se muestra "pocos datos".

**Actualizado por D21:** la regla de entregados y rebotes cambió a "gana el último evento".

La API entrega también las sumas de Total Opens y Clicked_Links_Count (que **no** coinciden con la
pantalla de Brevo; ver la nota de la Fase 3 en la bitácora) y la
definición de cada métrica, para que la pantalla explique la diferencia.
**Por qué:** "aperturas" de Brevo cuenta repeticiones y aperturas automáticas; queremos personas reales.

## D5 · 16/11/2026 · Dos cifras por campaña: "Total en Brevo" y "sin internos"

**Decisión:** cada campaña trae `totalBrevo` (todas las filas) y `metricas` (sin correos internos de
RED). Porcentajes, meses y totales usan `metricas`.
**Por qué:** así cuadran los dos números de control. #76 tiene 314 enviados y 6 personas con clic
en Brevo; sin el correo interno quedan 313 enviados y 5 personas con clic.

## D6 · 16/11/2026 · Campañas de prueba: lista editable, palabra completa

**Decisión:** la lista vive en `reglas.js` (`PATRONES_CAMPANA_PRUEBA`): `[VALIDACIÓN]`, `[PRUEBA]`,
`[TEST]`, `MARKETING TEST` y `TEST`. Se compara sin importar mayúsculas ni tildes y como palabra o
frase completa.

Verificado:
- son prueba "[VALIDACIÓN] Gerentes - Test Entregabilidad Grupo #18" y "MARKETING TEST 1";
- **no** son prueba "GERENTE OPERATIVO NOVIEMBRE 11", "TESTIMONIOS", "CONTEST" ni "LATEST".

Las campañas de prueba aparecen en la lista con `excluida = sí` y su motivo, pero no entran en
meses ni totales.
**Por qué:** buscar "TEST" dentro del texto marcaría por error nombres como "TESTIMONIOS".

## D7 · 16/11/2026 · Destinatarios internos: dominio exacto o subdominio

**Decisión:** son internos `red.com.gt`, `red.com.sv` y `redintelfon.com`, y sus subdominios
(p. ej. `ventas.red.com.gt`). Se compara el dominio completo, no un pedazo de texto.
Por eso `infored.com.sv`, que aparece en los datos reales, **no** se toma como interno.
**Por qué:** comparar por texto contenido confundiría dominios de otras empresas.
**Confirmado (16/11/2026):** Keily confirma que `infored.com.sv` es externo.

## D8 · 16/11/2026 · País por terminación del correo, sin adivinar

**Decisión:** `.gt` = Guatemala, `.sv` = El Salvador, lo demás (`.com`, `.net`…) = Desconocido.
**Por qué:** es lo único seguro con el dato disponible. Hoy "Desconocido" es la mayoría.

## D9 · 16/11/2026 · Una persona cuenta una vez por campaña

**Decisión:** dentro de una campaña, si el mismo correo aparece dos veces (sin importar
mayúsculas), se cuenta una sola vez y se informa en `duplicadosDescartados`. En los 3 CSV reales
no hay repetidos.

## D10 · 16/11/2026 · Mes de la campaña = primera fecha de envío

**Decisión:** el mes es el de la primera `Send_Date` de la campaña. Las horas se toman tal como
vienen en Brevo, sin convertir zona horaria.

## D11 · 16/11/2026 · Privacidad: solo totales al navegador

**Decisión:** correos, IPs y motivos de rebote se quedan en el servidor. La respuesta solo lleva
totales por campaña, mes y país. Como candado, si la respuesta contiene algo con forma de correo,
se bloquea con un error.
**Por qué:** los CSV de Brevo tienen datos personales de los destinatarios.

## D12 · 16/11/2026 · Sin fuente configurada: aviso claro, sin error

**Decisión:** si no hay fuente configurada (hoy en Vercel y Docker), la ruta responde 200 con
`fuente.configurada = false` y "Fuente de datos no configurada". Si la carpeta indicada no existe,
responde 500 sin mostrar la ruta.
**Por qué:** la carpeta local solo existe en la computadora de desarrollo. La Fase 2 (Drive)
resuelve Vercel y Docker.

## D13 · 16/11/2026 · No usar la llave de Brevo con `VITE_`; no tocar "Campañas de correo"

**Decisión:** el dashboard nuevo **no** usa `VITE_BREVO_API_KEY`. Una variable con prefijo `VITE_`
queda visible en el navegador. El dashboard viejo "Campañas de correo" (`mailing-campanas.html`) se
alimenta subiendo archivos de Brevo a mano y guarda en localStorage. No se modifica; se retirará
más adelante en otro PR.
**Por qué:** seguridad de la llave y no mezclar módulos.

## D14 · 16/11/2026 · Los CSV nunca entran al repositorio ni a Docker

**Decisión:** `*.csv` y `*.CSV` en `.gitignore` y `.dockerignore`.
**Por qué:** los reportes de Brevo tienen datos personales.

## D15 · 16/11/2026 · Google Drive como fuente; si están las dos, gana Drive

**Decisión:** `fuenteDrive.js` es una fuente más y reutiliza el mismo lector y la misma regla de
"campaña repetida → archivo más reciente" que la carpeta local. Si están configuradas Drive y la
carpeta local, se usa Drive y la respuesta lo dice (`fuente.tipo`, `fuente.descripcion` y `fuente.nota`).
Si solo está una de las dos variables de Drive, la ruta responde un error que dice cuál falta.
**Por qué:** Drive es la fuente oficial y funciona en local, Vercel y Docker. Cálculos y pantalla no cambian.

## D16 · 16/11/2026 · Sin librerías nuevas para Google

**Decisión:** el permiso de la cuenta de servicio se pide con `node:crypto` (firma del JWT) y
`fetch`, en `googleAuth.js`. Se pide solo lectura de Drive (`drive.readonly`). No se toca `package.json`.
**Por qué:** menos dependencias que mantener. La `google-auth-library` que hay en `node_modules`
llega solo como parte de otra librería y podría desaparecer.

## D17 · 16/11/2026 · Caché de 15 minutos y `?actualizar=1`

**Decisión:**
- el resultado de Drive se guarda 15 minutos en la memoria del servidor;
- al refrescar, solo se descargan los archivos cuya fecha de modificación cambió;
- `?actualizar=1` ignora la caché;
- los errores no se guardan: si falla la descarga de un archivo, se muestra lo demás, ese archivo
  aparece como ignorado con el motivo, y el siguiente pedido vuelve a intentar;
- el permiso de Google se reutiliza hasta 5 minutos antes de que venza (~55 min).

**Por qué:** menos llamadas a Google y respuestas rápidas aunque el historial crezca.
En Vercel la caché dura mientras la función siga "despierta"; si se apaga, la siguiente consulta lee Drive de nuevo.

## D18 · 16/11/2026 · Hojas de Google se ignoran

**Decisión:** si en la carpeta hay una Hoja de Google (un CSV que Drive convirtió), se ignora con el
motivo "Es una hoja de Google, no un CSV: sube el CSV original de Brevo". Lo mismo con otros
documentos de Google, subcarpetas y archivos que no son `.csv`.
**Por qué:** al exportar una hoja, Drive la entrega separada por comas, no por `;`, y puede cambiar las fechas.

## D19 · 16/11/2026 · Llave en JSON o en base64

**Decisión:** `GOOGLE_SERVICE_ACCOUNT_JSON` acepta el JSON tal cual o el mismo JSON en base64. También
se aceptan los saltos de línea de la llave escritos como `\n`. Ningún mensaje de error muestra la
llave ni el correo de la cuenta de servicio.
**Por qué:** algunos paneles (Vercel, Coolify) cortan o alteran los textos de varias líneas.

## D20 · 16/11/2026 · Reglas de la carpeta de Drive

**Decisión:**
- la carpeta y el proyecto de Google Cloud son de la cuenta de **MARKETING de RED**, nunca personal;
- Marketing es **Editor** y la cuenta de servicio es **Lector**;
- **nunca se borran CSV viejos**, porque la carpeta es el historial.

Ver [CONFIGURAR_DRIVE.md](CONFIGURAR_DRIVE.md).
**Por qué:** los CSV traen correos de clientes.

## D21 · 16/11/2026 · Entregado o rebote: gana el último evento con fecha

**Decisión:** cada persona queda en **un solo** estado según el último evento con fecha entre entrega
(Delivered_Date), rebote temporal (Soft_Bounce_Date) y rebote permanente (Hard_Bounce_Date):
- **entregado:** lo último fue la entrega. Incluye a quien rebotó temporalmente y después sí recibió el correo;
- **rebote temporal / permanente:** lo último fue ese rebote, aunque antes hubiera fecha de entrega;
- **sin estado:** no tiene ninguna de esas fechas.

Así siempre se cumple: enviados = entregados + temporales + permanentes + sin estado.

Detalles aprobados por Keily:
- **a) Empate de hora** entre entrega y rebote: gana el rebote. Entre los dos rebotes, gana el permanente.
- **b) Fecha ilegible** (hay texto pero no es una fecha): el evento se cuenta como ocurrido. Si así no
  se puede ordenar, gana el rebote (el permanente antes que el temporal). El resumen de archivos lo
  informa en `avisos`.
- **c) Aperturas de personas que terminaron en rebote:** se siguen contando como aperturas reales,
  porque abrir es un hecho. El "% de apertura" muestra una nota visible con el número calculado, por
  ejemplo: "Incluye 4 personas que abrieron el correo y luego tuvieron un rebote temporal" (`notaPctApertura`).

**Contador nuevo:** `entregadosLuegoRebotados` cuenta a quienes tenían entrega pero después rebotaron.
Ya están dentro de los rebotes; es informativo. En los 3 CSV de noviembre son **10**, todos con rebote temporal.

**Nombres:** `rebotesDuros` y `rebotesSuaves` pasan a `rebotesTemporales` y `rebotesPermanentes`.
La fila estándar guarda las **fechas** de entrega y de rebote, no solo "sí/no".

**Por qué:** así los números cuadran con la pantalla de Brevo y con el otro dashboard de mailing de
la empresa. Con la regla anterior, "entregados" incluía a 10 personas que terminaron en rebote.

**Control ("Total en Brevo") de D21:**
- 854 enviados;
- 719 entregados (#74 = 157, #75 = 308, #76 = 254);
- 82 rebotes temporales y 53 permanentes;
- 147 aperturas reales;
- 12 personas con clic.

Todos ✅.

## D22 · 16/11/2026 · Semáforo: rojo solo para lo crítico

**Decisión:**
- los rebotes, en porcentaje sobre **enviados**;
- las bajas y quejas, sobre **entregados**, porque solo quien recibió el correo puede darse de baja o
  quejarse. Esto se ajustó el 16/11/2026, al separar "Salud del envío".

Los umbrales están en un solo lugar (`src/modulos/marketing/canales/pantalla/datos.js`, `UMBRALES`):

| | Verde (bien) | Amarillo (atención) | Rojo (crítico) |
|---|---|---|---|
| Rebote permanente | < 2 % | 2 % a < 5 % | ≥ 5 % |
| Rebote temporal | < 10 % | ≥ 10 % | nunca |
| Quejas (spam) | 0 | alguna, por debajo de 0.1 % | ≥ 0.1 % |
| Bajas | < 1 % | ≥ 1 % | nunca |
| Apertura y clic | gris: "Meta pendiente" | | |

Con menos de 5 entregados no se colorea: dice "pocos datos". La tarjeta "Bajas · Quejas" toma el
peor de los dos colores.

**El color se decide con el mismo porcentaje que se ve** (redondeado a 1 decimal). Ejemplo: la #75
tiene 9.97 % de rebote temporal; en pantalla se lee "10.0 %", así que sale **amarillo**. Con la cifra
sin redondear habría salido verde junto a un "10.0 %", y eso confunde. En quejas, cualquier queja ya
es amarillo, aunque el porcentaje redondeado diga 0.0 %.

**Por qué:** las metas de apertura y clic todavía no están definidas. El rebote permanente alto sí es
crítico, porque daña la reputación del remitente.
Con los datos de noviembre:
- **rebote permanente:** la #75 (7.0 %), la #76 (8.6 %) y el total (6.2 %) salen en rojo;
- **rebote temporal:** la #75 ("10.0 %") y la #76 (10.5 %) salen en amarillo.

## D23 · 16/11/2026 · Pantalla: dos cifras con selector, sin recalcular en el navegador

**Actualizado por D25 a D28:** el orden y el estilo de la pestaña cambiaron, y la tabla de campañas
ahora es el "Ranking de campañas". Lo de abajo sigue vigente.

**Decisión:**
- El selector **"Sin internos (oficial)" / "Total en Brevo"** cambia todas las cifras de la pestaña
  Mailing. La ventana de detalle muestra las dos juntas. **Nunca dice "como Brevo".**
- La API también entrega `totalBrevo` en cada mes y en los totales. La pantalla **no recalcula**
  ninguna métrica: solo elige el bloque y le da formato.
- La **fecha de envío sale siempre de `fechaEnvio`** (Send_Date), nunca del nombre de la campaña. Se
  muestra tal como viene, sin convertir zona horaria. Por ejemplo, la #75 dice 11/11/2026 aunque su
  nombre diga "NOVIEMBRE 9".
- **Asunto:** "Pendiente (catálogo)" hasta que exista el catálogo de campañas.
- **Metas:** "Campañas del mes vs meta", "% apertura" y "% clic" en gris con "Meta pendiente"
  (`METAS` en `datos.js`).
- **Países:** solo en la ventana de detalle, en gris, con el aviso del % "Desconocido" (calculado).
  No se destacan comparaciones por país.
- **Las campañas de prueba** no van en la tabla principal, sino en "Exclusiones" con su motivo.
- **Clics:** nota "pueden incluir clics automáticos de antivirus". Aperturas totales y clics en enlaces
  distintos, con la nota de que la pantalla de Brevo usa otra fórmula.
- **Redes sociales y Otros:** "Pendiente de fuente de datos", sin cifras. La pestaña "Resumen" no se
  hace hasta tener Redes.

**Por qué:** que los números coincidan en todas partes y que cada cálculo se explique en pantalla.

## D24 · 16/11/2026 · Lo que NO va en Marketing por canales

**Decisión:** la pestaña Mailing **no** incluye:
- Lead Scoring;
- Embudo comercial;
- Pipeline;
- nada por empresa.

Esas secciones sí estaban en el dashboard viejo "Campañas de correo".

**Por qué:**
- **Lead Scoring y Embudo comercial son de Ventas:** cubren lo que pasa *después* del lead, y ese tema
  ya lo cubre el **Flujo de ventas**.
- **Lead Scoring muestra datos personales** (contactos priorizados con nombre y correo).
- **La empresa no viene en el CSV de Brevo.**

Si en el futuro Ventas los necesita, irían en el Flujo de ventas, no aquí.

## D25 · 16/11/2026 · Estilo visual del dashboard viejo, sin copiarlo completo

**Actualizado por D31 (17/11/2026):** el orden y el formato siguen ahora el mockup aprobado. "Comparar
campañas" y las pestañas Mejores/Peores se quitaron.

**Decisión:** la pestaña Mailing usa el **estilo visual** de "Campañas de correo"
(`public/dashboards/marketing/mailing-campanas.html`, solo como referencia; ese archivo **no** se modificó):
- anillos;
- tarjetas de salud con borde de color;
- títulos de sección en mayúsculas con borde azul;
- tabla de ranking;
- tarjetas de comparación con mini métricas.

No se copió el archivo completo: el ingeniero dijo que "unía todo y no se entendía".

**Orden de la pestaña:**
1. Campañas del mes vs meta.
2. Métricas de interacción (anillos).
3. Leads generados y calificados por campaña: pendiente, porque Prospekt IA no guarda el correo del lead.
4. Salud del envío.
5. Ranking de campañas.
6. Aperturas por cargo.
7. Por territorio/vendedor: pendiente del catálogo de campañas.
8. Comparar campañas.
9. Evolución por mes.
10. ¿Cómo se calcula cada número?

Exclusiones va como bloque corto entre el 9 y el 10.

**Detalles aprobados:**
- **El ranking es la tabla de campañas** (una sola tabla):
  - ordenable por % apertura (por defecto), CTR, CTOR o rebote permanente;
  - pestañas Mejores/Peores;
  - las campañas con pocos datos van al final, atenuadas;
  - al hacer clic se abre la misma ventana de detalle.
- **Salud del envío:** **Entregados + Rebote permanente + Rebote temporal** suman el 100 % de lo
  enviado (718 + 53 + 82 = 853; si hubiera "sin estado", también entra). **Bajas · Quejas** va aparte,
  en el grupo "De los entregados · no se suman a lo anterior", con su % sobre entregados.
- **Comparar campañas:** se eligen hasta 4. Al abrir están elegidas las 3 más recientes.
- **Por cargo:** barras horizontales con % de apertura y "X de Y entregados".
- **Gráficas:** dibujadas a mano (SVG/CSS), sin librerías.

## D26 · 16/11/2026 · Anillos: Excelente / Promedio / Bajo con rangos de referencia

**Decisión:** 4 anillos. Cada uno muestra el % grande, "X de Y", una línea de explicación, la
etiqueta y sus rangos visibles. Debajo va la nota visible "Referencia general B2B, no es la meta de RED
(meta pendiente)".

| Anillo | Cálculo | Excelente | Promedio | Bajo | Crítico |
|---|---|---|---|---|---|
| ENTREGA | entregados ÷ enviados | ≥ 98 % | 95–98 % | < 95 % | < 90 % |
| APERTURA | aperturas reales ÷ entregados | ≥ 30 % | 20–30 % | < 20 % | — |
| CTR | personas con clic ÷ entregados | ≥ 5 % | 2–5 % | < 2 % | — |
| CTOR | personas con clic ÷ aperturas reales | ≥ 20 % | 10–20 % | < 10 % | — |

- **Sin huecos:** Excelente desde el límite superior; Promedio desde el inferior y por debajo del
  superior; Bajo por debajo del inferior. Se evalúa el mismo % que se ve (1 decimal), igual que en D22.
- **Colores:** Excelente verde, Promedio azul, Bajo amarillo. **Rojo solo si la entrega es menor a
  90 % (Crítico).** Nunca rojo para apertura, CTR ni CTOR.
- Los rangos están en un solo lugar: `REFERENCIAS` en `datos.js`.
- **Noviembre (sin internos):**
  - entrega 84.2 %, 🔴 Crítico;
  - apertura 20.3 %, 🔵 Promedio;
  - CTR 1.5 %, 🟡 Bajo;
  - CTOR 7.5 %, 🟡 Bajo.

## D27 · 16/11/2026 · Cargo tomado del nombre de la campaña

**Decisión:** mientras no exista el catálogo de campañas, el cargo sale del **nombre** de la campaña:
"GERENTE GENERAL", "GERENTE FINANCIERO" u "GERENTE OPERATIVO", como frase completa y sin importar
mayúsculas ni tildes. Se acepta "GERENTE FINACIERO", que es como viene el nombre real de la #75. Lo
demás queda como "Sin cargo".

La lista está en `server/marketingCanales/reglas.js` (`CARGOS`). La API entrega `cargo` por campaña
y `porCargo` (sin internos y Total en Brevo).

**Cuando exista el catálogo, mandará el catálogo.**

## D28 · 16/11/2026 · Entrega y CTOR calculados en el servidor

**Decisión:** la API entrega `pctEntrega` y `pctCtor` en campañas, meses, cargos y totales. La pantalla
no los calcula.
- **`pctEntrega`** = entregados ÷ enviados. Con menos de 5 enviados: pocos datos.
- **`pctCtor`** = personas con clic ÷ aperturas reales. Con menos de 5 aperturas reales: pocos datos
  (`pocosDatosCtor`).

**Control:**
- CTOR: #74 = 1 ÷ 28 = 3.6 %, #75 = 5 ÷ 62 = 8.1 %, #76 = 5 ÷ 56 = 8.9 %, total = 11 ÷ 146 = 7.5 %
  (sin internos);
- entrega: 718 ÷ 853 = 84.2 % (sin internos) y 719 ÷ 854 = 84.2 % (Total en Brevo).

## D29 · 17/11/2026 · Filtros de la pantalla: `?campanas=` en el servidor

**Decisión:** el período, el cargo y el filtro de campañas solo deciden **qué campañas** entran.

La pantalla manda esa lista al servidor (`/api/marketing/mailing?campanas=74,75`), y el servidor recalcula
con los **mismos cálculos de siempre** los meses, cargos, totales y destacados. La pantalla no
recalcula nada (D23).
- **Sin filtro** (o con todas las campañas elegidas), la respuesta es idéntica a la de antes.
- **`disponibles`** trae siempre todas las campañas, para dibujar los chips.
- **`filtro`** informa qué campañas se pidieron y cuáles no se encontraron.
- **El período** compara la **fecha de envío** (Send_Date) de cada campaña.
- **Las campañas de prueba** nunca se ofrecen como chips y siempre se informan en "Transparencia de datos".
- **Un filtro mal escrito** responde 400.
- **Si no queda ninguna campaña elegida**, la pantalla muestra un aviso y no consulta.

## D30 · 17/11/2026 · Destacados calculados en el servidor

**Decisión:** la API entrega `destacados` para cada vista (sin internos y Total en Brevo). Solo
**elige** entre cifras ya calculadas:
- **Mejor campaña:** el mayor % de apertura entre las campañas con **5 o más entregados**. Si empatan,
  gana la de más entregados.
- **Mejor cargo:** igual, entre los cargos (sin "Sin cargo").
- **Peor entrega:** el menor % de entrega. Si empatan, gana la de más enviados.
- **Mejor país:** compara solo Guatemala y El Salvador. **Si más del 50 % de los envíos tiene país
  "Desconocido"**, dice "Pocos datos" con ese %. El país se mide siempre sin internos.

**Noviembre:**
- mejor campaña: #76 (22.1 %);
- mejor cargo: Gerente Operativo;
- peor entrega: #76 (80.8 %);
- mejor país: Pocos datos (82 % desconocido).

## D31 · 17/11/2026 · Una sola vista con el formato del mockup aprobado

**Decisión:** la pantalla de Mailing sigue el mockup aprobado
(`mockup-mailing.html`, fuera del repo). Ese mockup sigue el formato del dashboard original
"Campañas de correo". Se copiaron **los valores** de `dashboard.css`, `mailingCampanas.css` y
`estandar.css` con el prefijo `.mkt-`; esos archivos **no** se modificaron.

**Orden:**
1. Encabezado ("Marketing · Mailing", "Campañas de correo" y botón rojo Actualizar).
2. Barra de filtros estándar (Cifras, Período, Filtros, Limpiar filtros) y la línea "Mostrando…".
3. Transparencia de datos, con "Ver desglose de exclusiones".
4. Filtro de campañas (chips).
5. Resumen del mes.
6. Métricas de interacción (anillos).
7. Salud del envío: 6 tarjetas.
8. Mejor campaña, mejor cargo, peor entrega y mejor país.
9. Aperturas por cargo y Evolución por mes.
10. Embudo de conversión.
11. Ranking de campañas.

"¿Cómo se calcula cada número?" va plegado al final.

**Se quitó:**
- **Pestañas:** es una sola vista. Redes sociales y Otros no se muestran hasta tener fuente de datos.
- **"Comparar campañas":** el Ranking de campañas ya compara las campañas. Se puede volver a agregar
  cuando exista el catálogo con el asunto.
- **Pestañas Mejores/Peores del ranking:** se ordena de mayor a menor % de apertura, y las campañas con
  pocos datos van al final.

**Siguen fuera:** Lead Scoring y Embudo comercial (D24).

**Reglas visuales:**
- **Salud del envío:**
  - Entregados se colorea por la evaluación de la entrega;
  - los rebotes, las bajas y las quejas, por su semáforo;
  - la apertura automática, en azul (dato informativo);
  - una nota aclara que solo entregados + rebotes suman el 100 %.
- **Mejor campaña y mejor cargo** se colorean por su evaluación de apertura. Hoy salen en azul
  (Promedio); el mockup los mostraba en verde.
- **Aperturas por cargo:** de mayor a menor %, con una escala de 0 a 30 % (se amplía si algún cargo pasa
  de 30 %) y líneas punteadas en 20 % y 30 %.
- **Evolución por mes:**
  - barras en azul/gris, que no son un semáforo;
  - los colores de estado solo van en las 3 mini tarjetas del último mes;
  - eje con números redondos;
  - espacio "Aquí aparecerán los próximos meses" mientras haya menos de 2 meses.
- **Ranking:**
  - cada % es una pastilla con su color;
  - **Muestra:** Alta con 15 o más entregados, Media de 5 a 14, Baja con menos de 5;
  - el cargo se muestra corto ("G. Operativo") para que entren las 14 columnas.
- **Rojo:** solo para lo crítico. El rojo del botón Actualizar y del botón activo es el color de acción
  del portal, no un estado.
- **Menú:** sigue diciendo "Marketing por canales" hasta que se retire el dashboard viejo.

Reemplaza el orden de D25.

## D32 · 17/11/2026 · Un solo filtro de cargo

**Decisión:** hay **un solo** filtro de cargo: el del panel "Filtros" de la barra de arriba, que cambia
toda la página, incluido el ranking. El ranking no tiene filtro de cargo propio; solo la casilla
"Solo muestra suficiente (≥5 entregados)".

**Por qué:** dos filtros de cargo confunden.

## D33 · 17/11/2026 · El dashboard de Mailing muestra solo lo que tiene datos reales

**Decisión:** se quitaron de "Resumen del mes" las tarjetas sin datos:
- "Campañas del mes vs meta" (la meta no existe);
- "Leads generados";
- "Leads calificados".

El Resumen queda con una sola tarjeta, **"Campañas del mes"**: cuántas campañas cuentan en el último
mes con envíos y cuáles son, con su fecha de envío. Respeta los filtros y el selector Sin internos /
Total en Brevo.

La nota de los anillos queda como "Referencia general B2B, no es la meta de RED", sin "(meta pendiente)".

Lo que falta para mostrar lo quitado está en REQUISITOS.md, sección "Pendiente por falta de datos"
(P1 a P5).

**Por qué:** las tarjetas vacías ("—", "Pendiente") no aportan y distraen. Si una cifra no tiene fuente,
no se muestra.

**No cambió:** ningún cálculo ni número del servidor. Ningún cálculo usaba metas ni leads.
