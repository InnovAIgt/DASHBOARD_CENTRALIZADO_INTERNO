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

**Actualización D37:** para que la regla sea determinista, prevalece el último evento; los empates se
resuelven por más filas, fecha de Drive y nombre del archivo.

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

**Actualizado por D34, D39 y D42 (17/11/2026):** la ruta principal `/api/marketing/mailing` sigue
igual (solo totales y con su candado). Las listas por persona, incluidos los motivos y recomendaciones
de rebote, salen por separado en `/api/marketing/mailing-detalle`, sin clave adicional y sin IPs.

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

## D34 · 17/11/2026 · Detalle por persona ("Quién abrió y quién hizo clic") con clave

**Decisión:** la ventana de detalle de una campaña muestra **una fila por persona**, con estas columnas:
- correo;
- país (.gt / .sv; si no, "—");
- resultado;
- número de clics;
- enlace(s) que tocó;
- fecha del evento final.

Encima van los botones de filtro por resultado (con su cantidad) y un buscador por correo. También
aparece la nota: "Ningún sistema de correo mide si alguien leyó el contenido. Tomamos como lectura la
apertura real (sin las automáticas del iPhone); el clic es la señal más segura de interés."

**Resultado:** uno solo por persona, con la MISMA regla del estado final (D21). Gana el primero que aplique:
1. Queja (rojo)
2. Rebote permanente (rojo)
3. Rebote temporal (amarillo)
4. Sin estado (gris)
5. Se dio de baja (amarillo)
6. Hizo clic (verde)
7. Abrió (lectura real) (azul)
8. Abrió solo automático (Apple MPP) (gris)
9. Entregado sin abrir (gris)

- Si la persona abrió o hizo clic **antes** de una queja, un rebote, una baja o sin estado, la pastilla lo
  indica: "· había hecho clic" o "· había abierto".
- La columna Clics muestra siempre los clics reales.
- La **fecha del evento final** es la del evento que decide el resultado. Si es ilegible, dice "fecha ilegible".
- **Enlaces:** solo texto corto (dominio y ruta, sin parámetros), con la dirección completa al pasar el mouse.
  No son clicables, para no generar clics falsos.

**Vistas y exclusiones:**
- "Sin internos" quita los correos internos; "Total en Brevo" los incluye, marcados "Interno".
- Una campaña de prueba responde "excluida".
- Se aplica el mismo descarte de correos repetidos que en los cálculos.

**Cuadre (obligatorio):** el servidor calcula la tarjeta de la campaña con `calcularMailing` y la compara
con la lista. Los campos son:
- enviados y entregados;
- aperturas reales y personas con clic;
- rebotes permanentes y temporales;
- sin estado, bajas y quejas.

La ventana muestra la línea de cuadre y explica por qué el botón "Hizo clic" puede ser menor que
"personas con clic" (cuenta el resultado final).

Si la tarjeta que se ve en la página no coincide con la de la lista, avisa "Los datos cambiaron desde la
última lectura: presiona Actualizar". En Vercel, cada función guarda su propia lectura de Drive durante
15 minutos, así que puede pasar.

**Privacidad y protección:**
- **Ruta aparte:** `/api/marketing/mailing-detalle?campana=76&vista=metricas`, en `server.ts` y en
  `api/marketing/mailing-detalle.js` (Vercel). Se pide **solo al abrir la ventana**. La ruta principal
  no cambia y sigue sin correos.
- **Clave:** `MARKETING_DETALLE_CLAVE` (solo servidor, sin `VITE_`; en `.env.example` solo el nombre, vacío).
  - Viaja en el encabezado `X-Marketing-Clave`, nunca en la dirección.
  - Se compara de forma que no revela cuánto se parece.
  - En la página vive solo en memoria: al recargar, se vuelve a pedir.
- **Mínimo 24 caracteres.** Si la clave configurada es más corta, la ruta responde "No disponible" y
  avisa que es demasiado corta, sin mostrarla.
- **Freno de intentos:** cada clave incorrecta espera 1 s. Con 5 fallos en 15 minutos, esa conexión queda
  bloqueada 15 minutos.
  - **En Vercel el freno no es exacto:** la cuenta vive en la memoria de cada copia de la función, se
    pierde si Vercel la apaga, y varias copias llevan cuentas separadas.
  - Por eso la protección principal es la **clave larga** (mínimo 24 caracteres).
  - La espera de 1 s sí funciona siempre.
  - Un freno exacto necesitaría una base compartida (por ejemplo Vercel KV): queda pendiente.
- **Respuestas:**
  - sin clave configurada o clave corta → 503;
  - clave incorrecta → 401;
  - bloqueado → 429;
  - campaña inexistente → 404;
  - campaña de prueba → 409;
  - parámetros malos → 400;
  - método distinto de GET → 405.

  Siempre van con `Cache-Control: no-store`.
- **Sin descarga ni exportación en esta ventana.** No se mandan IPs. No se escriben correos ni la
  clave en los registros ni en archivos. Los motivos de rebote se agregan en D39, solo en las listas
  protegidas de tarjetas e informe.
- **Pruebas:** solo con correos inventados. Con los CSV reales solo se imprimen conteos.

**Limitación general (pendiente):** el portal no tiene inicio de sesión en el servidor. Esta clave protege
solo la lista por persona.

**Control con los CSV de noviembre:** la lista cuadra con la tarjeta en las 3 campañas y en las dos vistas.
Suma 853 personas sin internos y 854 en Total en Brevo.

## D35 · 17/11/2026 · Mailing con el "marco" estándar del portal (modelo: Activaciones)

**Decisión:** la vista, las gráficas, los datos y los cálculos de Mailing **no cambian**. Lo que se igualó
con Activaciones es el **marco**:
- **Encabezado:** línea chica, título y subtítulo, con la **pastilla de estado** debajo: "Consultando la
  API…", "…puede tardar hasta un minuto", "Actualizado: HH:MM" o "Sin conexión con el servidor de datos".
- **Tarjeta "FILTROS":**
  - grupo **Cifras** (Sin internos / Total en Brevo), al instante;
  - **Período** con calendario y botón para restablecer, al instante;
  - botón **Filtros** con contador y flecha, que abre el **panel tipo Excel** con columnas **Cargo** y
    **Campañas** (buscador, "Seleccionar todo", n/m, "Limpiar todo" y **"Aplicar"**);
  - botón **PDF**;
  - **botón actualizar redondo** (`?actualizar=1`).
- **Franja "Filtro activo"**, con "✕ Mostrar todas las campañas", y la línea "Mostrando…" de siempre.
- **Mensajes:**
  - círculo de carga en la primera carga;
  - pastilla y mensaje exacto en los errores, con "Reintentar";
  - "No se encontraron campañas con los filtros seleccionados" con botón.

**Se quitó:**
- la tarjeta de chips "Filtro de campañas": las campañas pasaron a la columna "Campañas" del panel;
- el botón rojo "Actualizar" del encabezado.

**Filtros:** hacen lo mismo que antes; solo cambia el formato. El cargo ahora es una lista con casillas,
así que se puede marcar más de uno. Siguen eligiendo **qué campañas** entran (`?campanas=`, D29).

**PDF:**
- usa la herramienta **compartida** `public/assets/js/dashboard-pdf.js`, `.css` y `-logo.js`, **sin modificarla**;
- es la misma de Activaciones, Facturación por línea y Flujo de ventas v2;
- los chips de la ventana muestran los filtros activos al exportar.

Módulos en D35 (actualizados por D36 y D40):
1. **Resumen:** campañas del mes, métricas de interacción, salud del envío y destacados.
2. **Gráficas:** aperturas por cargo, evolución por mes y embudo, como tablas con barras simples.
3. **Ranking de campañas.**
4. **Transparencia:** resumen de fuente, archivos y exclusiones; ya no hay sección "¿Cómo se calcula?".

El reporte se arma **solo** con la respuesta de `/api/marketing/mailing`, es decir, solo totales.
- **La lista por persona no es un módulo y nunca entra.**
- Si el reporte trajera algo con forma de correo, se bloquea y no se descarga nada.
- Tampoco se exporta mientras se actualizan los datos ni cuando no hay campañas elegidas.

**Compartido o copiado:**
- La ventana de PDF se **reutiliza** sin tocarla.
- La pastilla, el círculo de carga, la barra, el panel y la franja se **copiaron** con el prefijo `.mkt-`, como
  hizo el Flujo de ventas v2.
- `estandar.js` no se carga en React: "espía" todas las consultas de la página y afectaría al portal completo.
- **No se modificaron** `activaciones.*`, `estandar.*` ni `dashboard-pdf.*`, así que ningún otro dashboard
  se afecta.

**Una sola vista, sin pestañas** (D31).

El menú sigue diciendo "Marketing por canales" hasta que se retire el dashboard viejo.

---

## D36 · 17/11/2026 · Textos simples y "Transparencia de datos" del PDF en 1 página

**Textos:**
- La pantalla, la ventana de detalle, la lista por persona y el PDF hablan en palabras simples.
- No muestran nombres de columnas de Brevo (Open_Date, Send_Date, Total Opens, MPP…).
- Los nombres siguen igual **en el código**, porque son los que se leen del CSV.
- **Excepción:** el motivo de un archivo ignorado porque "no parece un reporte de Brevo" nombra las columnas que
  faltan, para que Marketing pueda corregir el archivo.

**PDF:**
- "Transparencia de datos" es un resumen de 1 página:
  - fuente y última lectura;
  - cantidad de archivos usados e ignorados, sin nombres ni datos de personas;
  - cantidad de avisos;
  - correos analizados, correos internos y campañas de prueba como totales.
- La lista de cada archivo con sus campañas y avisos se queda en la pantalla.
- El PDF sigue sin incluir personas ni correos.

## D37 · 17/11/2026 · Campañas repetidas: gana el último evento

**Decisión:** si varios CSV contienen una misma campaña, gana el que tenga el **último evento**. Si
empatan, desempata en este orden: más filas, fecha de modificación de Drive y nombre del archivo.
Se informa cuántas copias se ignoraron y el desglose de cada campaña en Transparencia, tanto en
pantalla como en el resumen del PDF. El PDF conserva una sola página de Transparencia y solo cifras.

**Pruebas A–E:** CSV sintéticos cubren último evento, filas, fecha de Drive, nombre y campaña sin copias.

## D38 · 17/11/2026 · País en todos los agregados y orden de secciones

**Decisión:** el filtro País ofrece Todos, GT, SV y Sin país; deriva el país del dominio (.gt / .sv,
lo demás desconocido) y recalcula tarjetas, gráficas, ranking, listas, informe y PDF. La barra queda
en el orden de Activaciones (País, período, filtros, PDF, actualizar) y Cifras pasa al panel.
En pantalla y PDF, Salud del envío aparece antes de Métricas de interacción. Las explicaciones quedan
en el ícono (i), no en una sección extensa.

## D39 · 17/11/2026 · Listas por tarjeta y recomendaciones fijas

**Decisión:** las tarjetas de entregados, rebotes, apertura automática, bajas y quejas, y los anillos
de apertura/clic, abren listas filtradas por la selección activa. El correo y el motivo se recuperan
solo por la ruta separada de detalle (sin clave adicional desde D42). Las recomendaciones son reglas fijas por palabras del motivo, nunca IA,
no escriben en Brevo y solo aparecen para rebotes y quejas. La ventana ofrece buscador y resumen de
acciones; no tiene descarga.

## D40 · 17/11/2026 · Informe detallado y Excel detrás de la clave

**Decisión:** después del ranking aparece "Auditoría y exportación / Informe detallado de correos",
con los filtros activos, buscador, resultados y totales. Usa la misma ruta y clave del detalle por
persona. Excel solo se ofrece después de escribir la clave, usa esos mismos filtros y columnas y no
incluye IPs. El informe y las listas nunca forman parte del PDF.

## D41 · 17/11/2026 · Cierre F y validaciones pendientes

- Paso A queda registrado como **✅ `5e0e837`**.
- B–E tienen implementación y pruebas sintéticas. Se guardan en 2 commits: B solo, y C–F juntos para que
  ningún commit deje la pantalla a medias.
- No había CSV en el repositorio; Keily indicó una carpeta local autorizada. Su lectura directa confirmó
  3 archivos y los controles 853 / 854 (718 / 719 entregados; 53 rebotes permanentes y 82 temporales).
- En un intento de validación, la configuración automática seleccionó Google Drive. Se detuvo el
  servidor al detectarlo; la solicitud devolvió solo agregados. Las validaciones posteriores se
  ejecutaron directamente desde la carpeta local y confirmaron `carpeta-local`. No se harán más
  consultas a Drive.
- No se modificaron `.env*`, `package.json`, `vercel.json`, Activaciones, `estandar.*`,
  `dashboard-pdf.*` ni otros dashboards.
- Capturas de escritorio/teléfono y PDF de ejemplo con totales siguen pendientes de generarse desde
  el portal usando exclusivamente la carpeta local.
- Pendientes de producto: leads, metas, programadas, territorio, Redes, Otros y seguridad (`.env.example`
  y portal sin inicio de sesión).

## D42 · 17/11/2026 · Detalle visible sin clave adicional

**Decisión:** retirar el formulario que pedía una clave al abrir listas e informe. El usuario quiere
ver esos datos directamente, sin proporcionar una clave ni una API key externa. La interfaz consulta
la ruta interna `/api/marketing/mailing-detalle`; esa ruta devuelve correos, motivos y recomendaciones
sin autenticación adicional, con `Cache-Control: no-store`. El PDF sigue usando solo agregados.

**Alcance de privacidad:** cualquier persona que pueda alcanzar esa URL puede consultar los correos.
El inicio de sesión actual solo controla la interfaz y no autentica la API. Se deja constancia de ese
riesgo por la decisión expresa de eliminar el paso de clave; no se modificaron secretos ni Supabase.

## D43 · 17/11/2026 · Reglas de recomendación ajustadas a los motivos reales

**Decisión:** Keily revisó los motivos reales de rebote de los 3 CSV (solo en el chat, sin guardarlos)
y ajustó las reglas. Solo cambia el **texto de la recomendación**; los números no cambian. Gana la
primera regla que aplique, en este orden:

| Si el motivo dice… | Recomendación |
|---|---|
| "out of storage space and inactive" u "OverQuotaPerm" | Buzón lleno e inactivo: quitar de la lista |
| "out of storage space" (OverQuotaTemp) | Se reintenta solo; si rebota 3+ veces, tratar como permanente |
| "vadesecure", o "Recipient rejected" con 403 | Bloqueado por el antispam del cliente: revisar contenido y reputación con TI |
| "SMTP Authentication", "authentication required" o "not permitted to relay" | Problema del servidor del cliente: avisar al ejecutivo y reintentar |
| "Unable to find MX" (dominio) | Revisar si el dominio está mal escrito (ej. gmail.com.sv); si no, quitar |
| solo "hard bounce", "recipient address rejected", "mailbox unavailable", "no mailbox", "does not exist", "user unknown" o "5.4.1 Access denied" | Corregir con el ejecutivo o quitar de la lista en Brevo |
| "connection timeout" | Esperar al siguiente envío |
| "message too large", "size limit" o "552 5.3.4" | Reducir imágenes o adjuntos del correo |
| "SPF", "DKIM", "DMARC" o "unauthenticated" | Avisar a TI: revisar SPF, DKIM y DMARC |
| "Message delivery failed" y todo lo demás | Revisar manualmente |
| (queja) | Quitar de la lista; no volver a enviar |

Las reglas de tamaño y de SPF/DKIM/DMARC hoy no aparecen en los CSV; se mantienen para casos futuros.
Pruebas con motivos inventados para cada regla en
`server/marketingCanales/detallePersonas.test.js`.

**Resultado con los CSV reales:** 53 rebotes permanentes → todos "corregir o quitar". 82 temporales →
49 revisar dominio · 10 esperar · 9 revisar manualmente · 7 vigilar buzón · 3 avisar al ejecutivo ·
2 buzón inactivo · 2 antispam.

## D44 · 17/11/2026 · Mismo formato que el Flujo de ventas

**Decisión:** Mailing se ve igual que el **Flujo de ventas** (`src/modulos/marketing/flujo-ventas-v2`, que
no se modificó), sin cambiar números, cálculos ni gráficas. Reemplaza la "vista única sin pestañas" de D31.
- **Encabezado** con el botón actualizar redondo arriba a la derecha y línea divisoria; texto superior en rojo.
- **Barra de filtros en una sola fila:** País (Todos / GT / SV con las banderas del modelo; "Sin país"
  con el mismo botón, sin bandera) · Período con ✕ (solo aparece si hay fechas) · Filtros con contador
  rojo · PDF a la derecha.
- **Cifras** sigue dentro del panel "Filtros". El contador cuenta Cargo, Campañas y también "Cifras"
  cuando está en "Total en Brevo".
- **Zona fija:** la barra y los botones de módulos quedan arriba al desplazarse.
- **Botones de módulos:** "Resumen" (todo lo que había: transparencia, resumen del mes, salud, anillos,
  destacados, gráficas, embudo y ranking) e "Informe detallado" (buscador, tabla, totales y Excel). El
  informe ya no va al final del Resumen y sus correos se piden solo al abrir ese módulo.
- La línea "Mostrando…" y la franja "Filtro activo" van debajo de los botones de módulos, en los dos módulos.
- Mismo ancho y márgenes que el modelo; en teléfono los filtros se acomodan en varias filas, como el modelo.
- **PDF sin cambios:** 4 módulos de totales; el Informe detallado no entra.

**Comprobado:** 853 enviados "Sin internos" / 854 "Total en Brevo" en la ruta y en la pantalla; contador
en 1 con "Total en Brevo". Capturas lado a lado con el modelo (computadora y teléfono), con correos inventados.
