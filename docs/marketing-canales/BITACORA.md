# Bitácora · Marketing por canales

Rama de trabajo: `feature/marketing-mailing`

---

## Fase 0 · Revisión del repositorio — 16/11/2026 ✅

**Qué se hizo:** solo lectura; no se cambió ningún archivo.
- Patrón a seguir: `/api/marketing/reuniones`, es decir `server/` + `api/` + `server.ts`.
- La ruta nueva se registra antes de la regla `/api/*` → "Endpoint no encontrado".
- El menú se arma en `PortalLayout.tsx`, área MARKETING.
- La API de Prospekt IA tiene 40 campos y **ninguno es el correo del lead**.
- Los 3 CSV locales tienen el formato esperado y sus filas coinciden con los enviados de control.

**Decisiones de Keily:**
- dejar "Campañas de correo" sin tocar;
- dos cifras por campaña (Total en Brevo / sin internos);
- "TEST" como palabra completa;
- mes = primera fecha de envío;
- Fase 4 pendiente del correo en Prospekt IA;
- "fuente no configurada" en Vercel/Docker hasta la Fase 2.

---

## Fase 1 · Fuente local + cálculos + ruta — 16/11/2026 ✅

Keily probó `/api/marketing/mailing`: se ven las 3 campañas y ningún correo. Commit aprobado.

**Qué se hizo:**
- `server/marketingCanales/reglas.js` (nuevo): lista editable de pruebas, internos, país y mínimo de datos.
- `server/marketingCanales/brevoCsv.js` (nuevo): lee un CSV de Brevo y entrega filas estándar.
- `server/marketingCanales/combinarArchivos.js` (nuevo): junta todos los CSV; si una campaña se repite, gana el más reciente.
- `server/marketingCanales/fuenteLocal.js` (nuevo): fuente "carpeta local".
- `server/marketingCanales/calculos.js` (nuevo): métricas por campaña, mes, país, totales y exclusiones.
- `server/marketingMailing.js` (nuevo): une las piezas y arma la respuesta con candado de privacidad.
- `api/marketing/mailing.js` (nuevo): la ruta en Vercel.
- `server.ts`: la ruta en local y Docker, antes de la regla `/api/*`.
- `.env.example`: `MARKETING_LOCAL_CSV_DIR=` vacía.
- `.gitignore` y `.dockerignore`: `*.csv` y `*.CSV`.
- `docs/marketing-canales/`: README, REQUISITOS, DECISIONES (D1–D14) y esta bitácora.

**Pruebas:**
- Números de control con los 3 CSV reales: todos cuadran (ver tabla abajo).
- 37 casos con datos inventados, 0 fallas:
  - campañas de prueba;
  - internos y país;
  - fechas;
  - campaña repetida en dos archivos;
  - archivos ignorados;
  - filas malas;
  - comillas;
  - archivo Latin-1;
  - correos repetidos;
  - "pocos datos";
  - sin fuente;
  - carpeta inexistente;
  - POST.
- `npm run lint` (verificación de tipos): sin errores.
- Ruta real con `npm run dev`: HTTP 200, `no-store`, ningún "@" en la respuesta; POST → 405.

| Campaña | Enviados | Aperturas reales | Personas con clic (Brevo → sin internos) |
|---|---|---|---|
| #74 Gerente General | 169 ✅ | 28 ✅ | 1 → 1 ✅ |
| #75 Gerente Financiero | 371 ✅ | 62 ✅ | 5 → 5 ✅ |
| #76 Gerente Operativo | 314 ✅ | 57 ✅ | 6 → 5 ✅ (1 interno) |

**Qué no se tocó:**
- Flujo de ventas;
- "Campañas de correo";
- otros dashboards;
- `package.json` y `vercel.json`;
- Supabase.

---

## Fase 2 · Google Drive — 16/11/2026 ✅ commit `927f665` (falta la prueba con la llave real, irá en otro commit)

**Decisiones de Keily:**
- sin librerías nuevas;
- si están las dos fuentes, gana Drive;
- las hojas de Google se ignoran;
- la llave se acepta en JSON o base64;
- `?actualizar=1` para refrescar sin esperar;
- la cuenta de servicio la crea Keily con la cuenta de Google de MARKETING de RED.

**Qué se hizo:**
- `server/marketingCanales/googleAuth.js` (nuevo): permiso de solo lectura con la cuenta de servicio, sin librerías.
- `server/marketingCanales/fuenteDrive.js` (nuevo): lee la carpeta de Drive, con caché de 15 min y
  descarga solo de lo que cambió.
- `server/marketingCanales/errorFuente.js` (nuevo): el tipo de error compartido; antes estaba en `fuenteLocal.js`.
- `server/marketingMailing.js`: elige la fuente (gana Drive), informa cuál se usó y acepta `actualizar`.
- `api/marketing/mailing.js` y `server.ts`: pasan `?actualizar=1`.
- `.env.example`: `GOOGLE_SERVICE_ACCOUNT_JSON=` y `MARKETING_DRIVE_FOLDER_ID=` vacías.
- Docs:
  - `CONFIGURAR_DRIVE.md` (nuevo), con las reglas de cuenta de empresa, Editor/Lector y no borrar CSV;
  - DECISIONES D15–D20;
  - README y REQUISITOS actualizados.
- **No cambiaron:** cálculos, lector de CSV, regla de archivos repetidos, `package.json`, `vercel.json`.

**Pruebas:**
- **Drive simulado** con los 3 CSV reales y archivos inventados (llave inventada, sin internet): 33 casos y 7 revisiones de privacidad, 0 fallas.
  - Las cifras de Drive son **idénticas** a las de la carpeta local, y los números de control cuadran.
  - Lista de varias páginas.
  - Archivos ignorados con motivo: hoja de Google, documento, subcarpeta, .txt y copia vieja de una campaña.
  - Caché:
    - a los 10 min no vuelve a Drive;
    - a los 16 min vuelve y descarga solo lo que cambió;
    - `?actualizar=1` la ignora;
    - el permiso de Google se renueva cada hora.
  - Si falla una descarga, se muestra lo demás y no se guarda en caché.
  - La llave funciona en base64 y con `\n` escritos.
  - Errores con mensaje claro:
    - falta una variable;
    - llave mal copiada o dañada;
    - Google rechaza la cuenta;
    - carpeta no compartida;
    - API desactivada;
    - código de carpeta raro;
    - sin internet.
  - Ninguna respuesta lleva "@", ni la llave, ni el correo de la cuenta de servicio.
- Pruebas de la Fase 1, repetidas: 0 fallas.
- `npm run lint`: sin errores.
- Ruta real con `npm run dev` (carpeta local): HTTP 200 y las mismas cifras.

**Falta:** la prueba con el Drive real, cuando Keily tenga la llave (ver CONFIGURAR_DRIVE.md, Paso 5).

---

## Paso A · Regla "gana el último evento" — 16/11/2026 ✅

Keily revisó las tablas "Total en Brevo" y "Sin internos": correctas. Commit aprobado.

**Por qué:** para que los números cuadren con la pantalla de Brevo y con el otro dashboard de
mailing de la empresa. Si alguien tenía entrega y **después** un rebote, antes contaba como entregado.
Ahora cuenta como rebote (D21).

**Qué se hizo:**
- `server/marketingCanales/filaEstandar.js` (nuevo): la marca de "fecha ilegible", compartida por fuentes y cálculos.
- `brevoCsv.js`: la fila estándar guarda las fechas de entrega y de rebote. Las fechas ilegibles
  quedan como aviso en el resumen de archivos (`avisos`).
- `combinarArchivos.js`: pasa esos avisos al resumen.
- `calculos.js`:
  - estado final por persona (`estadoFinal`);
  - nombres `rebotesTemporales` y `rebotesPermanentes`;
  - contadores nuevos: `entregadosLuegoRebotados`, `sinEstado` y `aperturasDeRebotados`;
  - nota visible `notaPctApertura`;
  - textos de explicación actualizados.
- Docs: D21; D4 actualizada; README con la tabla de cálculo y los números de control; REQUISITOS R9a.
- **No cambiaron:** Drive, carpeta local, ruta, `package.json`.

**Pruebas:**
- Control con los 3 CSV reales: todo ✅ (16 revisiones).
- 50 casos inventados: incluyen entrega y luego rebote, rebote y luego entrega, empates, fecha
  ilegible, sin eventos y la nota de apertura.
- Drive simulado: 40 revisiones, sigue igual a la carpeta local.
- 0 fallas en total. `npm run lint` sin errores.

| "Total en Brevo" | #74 | #75 | #76 | Total |
|---|---|---|---|---|
| Enviados | 169 | 371 | 314 | **854** ✅ |
| Entregados | 157 | 308 | 254 | **719** ✅ |
| Rebotes temporales | 12 | 37 | 33 | **82** ✅ |
| Rebotes permanentes | 0 | 26 | 27 | **53** ✅ |
| Entregados y luego rebotados | 1 | 6 | 3 | **10** ✅ |
| Aperturas reales (de ellas, luego rebotaron) | 28 (0) | 62 (3) | 57 (1) | **147 (4)** ✅ |
| Personas con clic | 1 | 5 | 6 | **12** ✅ |

"Sin internos": 853 enviados, 718 entregados, 146 aperturas reales y 11 personas con clic. Solo cambia la #76.

---

## Fase 3 · Pantalla de Mailing — 16 y 17/11/2026 ✅

Keily aprobó las diferencias con el mockup (17/11/2026):
- "Mejor campaña" y "Mejor cargo" se quedan en **azul** (color de su evaluación);
- porcentajes con espacio;
- barras de evolución en azul y gris;
- nombre completo y cargo corto en el ranking;
- un solo filtro de cargo;
- sin pestañas.

**Qué se hizo:**
- `src/modulos/marketing/canales/` (nuevo): la pantalla, con pestañas Mailing, Redes sociales y Otros.
  Ver la tabla de archivos en el README.
- `PortalLayout.tsx`: el item "Marketing por canales" en el menú MARKETING, después de
  "Flujo de ventas", y la línea que muestra la pantalla.
- `server/marketingCanales/calculos.js`:
  - los meses y los totales también traen `totalBrevo`;
  - las explicaciones de aperturas totales y clics en enlaces distintos dicen que la pantalla de
    Brevo usa otra fórmula;
  - personas con clic agrega la nota de antivirus.

  **Ningún número cambió.**
- Docs: D22 (semáforo), D23 (pantalla), README, REQUISITOS.
- **No se tocó:**
  - Flujo de ventas;
  - "Campañas de correo";
  - otros dashboards;
  - estilos globales;
  - `package.json` y `vercel.json`.

**Error encontrado por las pruebas y corregido:** en la vista "Sin internos", la tabla de campañas
leía la campaña completa en vez de su bloque `metricas`. Se corrigió en `bloque()` de `datos.js`
antes de mostrar la pantalla.

**Ajuste visto en la foto:** la #75 mostraba "10.0 %" de rebote temporal en verde (el valor real es
9.97 %). Ahora el color se decide con el mismo porcentaje redondeado que se ve, así que sale amarillo (D22).

**Fotos de la pantalla** (Edge sin ventana, con los datos reales): pestaña Mailing a 1400 px,
ventana de detalle de la #75 y vista de teléfono a 390 px. Todo cabe en el ancho; solo la tabla se
desplaza hacia los lados dentro de su recuadro.

**Cambio de diseño pedido antes del commit (16/11/2026):** usar el estilo visual del dashboard viejo
"Campañas de correo", sin copiarlo completo y sin modificarlo.
- **Pantalla:**
  - la pestaña Mailing se reordenó en 10 secciones (D25);
  - 4 anillos con rangos de referencia B2B (D26);
  - la tabla de campañas pasó a ser el "Ranking de campañas";
  - nuevas: "Aperturas por cargo" y "Comparar campañas";
  - leads y territorio quedan como pendientes;
  - en "Salud del envío", Bajas · Quejas va aparte ("De los entregados · no se suman"), con % sobre entregados.
- **Servidor:**
  - `pctEntrega` y `pctCtor` (D28);
  - `cargo` y `porCargo` (D27);
  - explicaciones de entrega, CTOR y cargo.
- **No va:** Lead Scoring, Embudo comercial, Pipeline ni nada por empresa (D24).
- `public/dashboards/marketing/mailing-campanas.html` **no se modificó**, y "Campañas de correo" sigue en el menú.
- **Ajustes vistos en las fotos:** los números de las tablas ya no se parten en dos líneas, y el
  nombre de la campaña en el ranking tiene un ancho mínimo en teléfono.

**Cambio solo visual, siguiendo el mockup aprobado (17/11/2026):**
- **Pantalla:**
  - una sola vista, sin pestañas, con el formato del dashboard original "Campañas de correo" (D31);
  - nuevos: barra de filtros estándar, transparencia de datos, filtro de campañas, salud con 6 tarjetas,
    mejor campaña / cargo / país y peor entrega, gráficas del mockup, embudo y ranking con muestra;
  - se quitó "Comparar campañas";
  - un solo filtro de cargo (D32).
- **Servidor (aprobado antes de programar):**
  - filtro `?campanas=` (D29), en `calculos.js`, `marketingMailing.js`, `api/marketing/mailing.js` y `server.ts`;
  - `destacados` (D30);
  - **ningún número existente cambió**.
- **Archivos:**
  - nuevos: `Filtros.jsx` y `Graficas.jsx`;
  - se borró `EvolucionMensual.jsx`;
  - `PortalLayout.tsx` no se tocó: el menú sigue diciendo "Marketing por canales".
- **Ajustes vistos al comparar con el mockup:**
  - aperturas por cargo, de mayor a menor;
  - eje de evolución con números redondos (0 · 300 · 600 · 900);
  - el ranking muestra las 14 columnas en pantalla ancha (nombre en dos líneas, cargo corto).
- **Pruebas:** 60 revisiones de pantalla y servidor con los datos reales. Incluyen:
  - números aprobados idénticos;
  - el filtro: suma de campañas, "las 3 = sin filtro", id inexistente, filtro mal escrito → 400;
  - los destacados, con casos inventados (pocos entregados, país conocido);
  - muestra;
  - período, cargo y chips;
  - el orden de la vista igual al mockup;
  - que no haya pestañas, Comparar, Redes, Otros, Lead Scoring ni Embudo comercial;
  - un solo filtro de cargo;
  - anillos, salud, destacados, gráficas, embudo y ranking;
  - Total en Brevo;
  - la vista filtrada;
  - sin campañas;
  - la ventana de detalle.

  Las pruebas anteriores del servidor también siguen en 0 fallas.

**Pruebas anteriores (0 fallas):**
- **Pantalla, con los datos reales: 71 revisiones**, después del cambio de diseño. Además de lo de
  abajo, revisan:
  - el orden de las 10 secciones;
  - que no haya Lead Scoring, Embudo comercial, Pipeline ni empresa;
  - los anillos: valores, "X de Y", colores (entrega roja, apertura azul, CTR y CTOR amarillos) y rangos visibles;
  - los límites exactos sin huecos de los 4 rangos;
  - el CTOR del servidor (3.6 / 8.1 / 8.9 / 7.5 %) y "pocos datos" con menos de 5 aperturas;
  - la entrega: 84.2 %;
  - el cargo (incluido "FINACIERO"; "SUBGERENTE GENERAL" → Sin cargo);
  - salud del envío: 718 + 53 + 82 = 853, con bajas y quejas aparte sobre entregados;
  - el orden del ranking (mejores, peores, por rebote; pocos datos al final);
  - comparar (3 al abrir, con 4 métricas cada una);
  - las barras por cargo.
- Primera versión de la pantalla: 39 revisiones.
  - **Fecha** = Send_Date leída directo de los CSV. La #75 dice 11/11/2026 aunque su nombre diga
    "NOVIEMBRE 9", y no hay corrimiento por zona horaria.
  - **Cifras** iguales a las tablas aprobadas del Paso A:
    - Total en Brevo: 854/719/82/53/147/12/10;
    - Sin internos: 853/718/146/11.
  - **Semáforo:**
    - rebote permanente: #75 y #76 en rojo, #74 en verde, total 6.2 % en rojo;
    - rebote temporal: #76 (10.5 %) y #75 ("10.0 %") en amarillo, total 9.6 % en verde;
    - los límites exactos de cada umbral;
    - "pocos datos" sin color.
  - **Textos de la pantalla:**
    - sin "@" y sin "como Brevo";
    - asunto pendiente en las 3 campañas;
    - metas pendientes;
    - nota "Incluye 4 personas…";
    - nota de antivirus;
    - aviso "El 82 % … Desconocido";
    - exclusiones;
    - aviso de un solo mes.
  - **Ventana de detalle:**
    - fecha y hora (11/11/2026 15:37);
    - las dos columnas;
    - la nota de apertura de la #75 (3);
    - el correo interno de la #76.
  - **Casos especiales:** sin fuente (aviso y "Reintentar") y "pocos datos".
- `npm run lint` y `npm run build`: sin errores.
- Pruebas del servidor (Paso A, casos inventados, Drive simulado), repetidas: 0 fallas.

---

## Redes sociales · revisión (solo lectura) — 16/11/2026 ⏸️ se deja fuera por ahora

Decisión de Keily: Redes sociales **no** se construye todavía. La pestaña queda como "Pendiente de
fuente de datos", igual que "Otros". No se creó `/api/marketing/redes`.

**Lo que se encontró (para retomarlo):**
- **Fuente:** el Excel de Gaby en SharePoint, servido por el servicio de Render
  `https://dashboard-marketing-ks6o.onrender.com/api/rrss/excel`. Es un servicio aparte en
  Python (repo InnovAIgt/dashboard-marketing), en el plan gratis de Render.
  - Si no se usa, se apaga: la primera llamada tardó **32.5 s** y las siguientes, ~1 s.
- **Devuelve el Excel completo** (`.xlsx`), no una lista de datos. Hay que leerlo en nuestro servidor.
- **No pide llave:** es público, sin token ni contraseña.
- **Hoy no funciona:** responde **HTTP 502** con *"SharePoint respondió con estado 404. Es posible
  que el enlace público haya cambiado o haya expirado."* Se probó dos veces, con el servicio despierto.
  El servicio está bien; el **enlace público al Excel está roto**.
- **Librería:** `xlsx` **0.18.5** ya está en `dependencies` del proyecto (no hay que instalar nada).
- **Lógica existente para reutilizar** (sin modificar el archivo): `public/dashboards/marketing/flujo-ventas.html`,
  funciones `RRSS_GABY_HEADERS`, `rrssContextoHoja`, `rrssNormalizarFilaGaby`, `rrssConvertirLibroGaby`
  y `rrssNumero`.
  - Descarta las filas sin fecha ni red social.
  - Para Datared, el país es siempre El Salvador.
- **Hojas esperadas:**
  - "DATA RED": Datared, El Salvador;
  - "…GT": RED Intelfon, Guatemala;
  - "…SV": RED Intelfon, El Salvador.
- **21 columnas esperadas:**
  - U1 (fecha), id, Red social, Campaña, Link publicación, Presupuesto pauta;
  - Alcance, visualizaciones, Clics, Costo x clic, Interacciones, Comentarios, Compartidos;
  - Mensajes/Leads, Lead calificado, Costo x Lead;
  - Cierres exitoso (No. clientes), Costo x Cliente, No. de unidades, Costo X Unidad, post_id_meta.
- **Vercel:** para esperar a que Render despierte (60 s o más), la función necesita
  `maxDuration: 60` dentro de `api/marketing/redes.js`, sin tocar `vercel.json`. En el plan gratis
  de Vercel, 60 s es el máximo; en local y Docker no hay límite.
- **Diseño propuesto** (cuando se retome):
  - las mismas 3 piezas: fuente Render → lector del libro de Gaby → cálculos;
  - caché de 15 min y `?actualizar=1`;
  - espera de 75 s, con el mensaje "Despertando el servidor de redes sociales, puede tardar hasta
    un minuto" en vez de error;
  - un mensaje distinto si el enlace de SharePoint está roto;
  - variable `MARKETING_RRSS_URL`, solo servidor.

**Pendientes de Redes:**
- Conseguir una copia del Excel de Gaby y un **enlace nuevo** de SharePoint.
- Confirmar con Gaby:
  - la moneda del presupuesto por país;
  - qué cuenta como publicación "programada";
  - la columna de motivo;
  - si la meta de 14 publicaciones al mes es total o por marca.
- El servicio de Render es **público y sin llave**: avisar a Eduardo.
- Evaluar pasar el servicio de Render al centralizado.

---

## Pendientes

- **Pedir a Prospekt IA que guarde el correo del lead para el cruce de la Fase 4.**
- Crear la cuenta de servicio y la carpeta de Drive (Keily, con la cuenta de MARKETING de RED) y hacer la prueba real de la Fase 2.
- **Catálogo de campañas.** El CSV de Brevo no trae el ASUNTO del correo. Propuesta: un CSV
  "catálogo" en la misma carpeta de Drive, que llene Marketing, con las columnas
  Campaign ID, asunto, cargo, territorio/vendedor y marca. Asuntos conocidos:
  - #75: "Reduce tu tiempo muerto";
  - #76: "Producción a ciegas todavía".
- **Pestaña "Resumen"** (todos los canales juntos): no se hace hasta tener Redes sociales, porque sin
  Redes no hay datos de leads.
- **Redes sociales:** ver la sección "Redes sociales · revisión" arriba.
- **Lista de "correos a corregir"** para Marketing (rebotes permanentes y dominios inválidos).
  Evaluar cómo entregarla. **No mostrar correos de personas en el navegador sin la aprobación de Keily.**
- Retirar "Campañas de correo" (`mailing-campanas.html`) en otro PR (D13).

### Para la Fase 3 (pantalla) — anotado el 16/11/2026, no cambiar antes

- `totalAperturasBrevo` y `totalClicsBrevo` **no coinciden** con la pantalla de Brevo. Ejemplo:
  en la #75, Brevo muestra 94 aperturas y 17 clics, pero el CSV da 109 y 6. En la pantalla:
  - **no** decir "como Brevo";
  - usar "Aperturas totales (incluye repetidas y automáticas)" y "Clics en enlaces distintos";
  - agregar una nota de que la pantalla de Brevo usa otra fórmula.
- El **82 % de los envíos tiene país "Desconocido"**. Mostrar ese aviso y **no** destacar
  comparaciones por país.

---

## Cambios solicitados

| Fecha | Pedido | Dónde quedó |
|---|---|---|
| 16/11/2026 | "Campañas de correo" no usa la API de Brevo: se alimenta con archivos y localStorage. No usar `VITE_BREVO_API_KEY`. | D13 |
| 16/11/2026 | Verificar los patrones de prueba con nombres reales. | D6 |
| 16/11/2026 | Anotar como pendiente pedir el correo del lead a Prospekt IA. | Pendientes |
| 16/11/2026 | `infored.com.sv` es externo: se deja así. | D7 |
| 16/11/2026 | En pantalla no decir "como Brevo" (las cifras no coinciden con la pantalla de Brevo); avisar del 82 % de país "Desconocido". | Para la Fase 3 |
| 16/11/2026 | Reglas de Drive: cuenta de empresa, Marketing Editor / cuenta de servicio Lector, nunca borrar CSV viejos. | D20 · CONFIGURAR_DRIVE.md |
| 16/11/2026 | Entregado o rebote: gana el último evento. Contador "entregados y luego rebotados". Nota visible en "% de apertura" con el número calculado. | D21 · Paso A |
| 16/11/2026 | Pendientes: catálogo de campañas (asunto, cargo, territorio, marca) y lista de "correos a corregir". | Pendientes |
