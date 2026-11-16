# Marketing · Marketing por canales

> Responsable: Keily García · Inicio: 16 de noviembre de 2026
> Rama: `feature/marketing-mailing` · Estado: **Fase 2 (Google Drive) — falta la prueba con la llave real**

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

| Métrica | Regla |
|---|---|
| Enviados | Filas del reporte (una persona por fila; si un correo se repite, cuenta una vez). |
| Entregados | Tiene fecha de entrega y **no** tiene rebote duro. |
| Rebote duro | Tiene fecha de rebote duro. |
| Rebote suave | Tiene fecha de rebote suave y **no** tiene fecha de entrega. |
| Aperturas reales | Tiene fecha de apertura (Open_Date). |
| Solo apertura automática | Sin fecha de apertura y con aperturas de Apple (MPP) > 0. **No cuenta como real.** |
| Personas con clic | Clicked_Links_Count > 0. |
| Total aperturas "como Brevo" | Suma de Total Opens (incluye repeticiones y aperturas automáticas). |
| Total clics "como Brevo" | Suma de Clicked_Links_Count (cada enlace distinto de cada persona). |
| % apertura | Aperturas reales ÷ entregados. |
| % clic | Personas con clic ÷ entregados. |
| Bajas / Quejas | Tienen fecha de baja / de queja (spam). |

Con **menos de 5 entregados** los porcentajes no se calculan: "pocos datos".

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
