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

**Control ("Total en Brevo"):**
- 854 enviados;
- 719 entregados (#74 = 157, #75 = 308, #76 = 254);
- 82 rebotes temporales y 53 permanentes;
- 147 aperturas reales;
- 12 personas con clic.

Todos ✅.
