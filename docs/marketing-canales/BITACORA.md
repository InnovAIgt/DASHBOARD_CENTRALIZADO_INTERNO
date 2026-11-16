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

## Pendientes

- **Pedir a Prospekt IA que guarde el correo del lead para el cruce de la Fase 4.**
- Crear la cuenta de servicio y la carpeta de Drive (Keily, con la cuenta de MARKETING de RED) y hacer la prueba real de la Fase 2.
- **Catálogo de campañas.** El CSV de Brevo no trae el ASUNTO del correo. Propuesta: un CSV
  "catálogo" en la misma carpeta de Drive, que llene Marketing, con las columnas
  Campaign ID, asunto, cargo, territorio/vendedor y marca. Asuntos conocidos:
  - #75: "Reduce tu tiempo muerto";
  - #76: "Producción a ciegas todavía".
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
