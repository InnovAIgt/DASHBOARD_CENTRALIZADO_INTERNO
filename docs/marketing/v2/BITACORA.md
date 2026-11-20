# Bitácora · Marketing v2

Diario del trabajo del dashboard nuevo de Marketing. Lo más reciente va arriba.

## 2026-11-20 · Rama en GitHub y versión de prueba en Vercel

- Revisiones antes del push: `.env.example` sin valores; `.env.local`, `.claude/`, `.vscode/` y `.kiro/` ignorados;
  ningún CSV, Excel ni JSON de llaves agregado; sin llaves en el código nuevo. Los commits viejos de la rama traen el
  `.env.example` con los mismos valores que ya están en `origin/main` (nada nuevo expuesto).
- Push solo de `feature/marketing-v2` (sigue a `origin/feature/marketing-v2`); `main` sin cambios y sin PR.
- Keily puso en Vercel, solo en Preview y como Secret, `BREVO_WEBHOOK_SECRET`, `MKT_SUPABASE_URL` y
  `MKT_SUPABASE_SECRET_KEY`.
- Vercel armó la versión de prueba en 2 proyectos (`dashboard.centralizado` y `dashboard.centralizado.interno`). Las 2
  tienen protección: sin iniciar sesión responden 302 hacia el inicio de sesión de Vercel, así que Brevo no podría
  llamar al webhook. Decisión: opción A («Protection Bypass for Automation»), solo para la prueba y borrarlo al final.
- La tarea diaria (Vercel cron) se programa después de probar el webhook: Vercel solo corre crons en producción.

## 2026-11-20 · Tablas creadas y prueba local del webhook

- Keily corrió `sql/001_tablas_webhook.sql` en el proyecto «Dashboard Canales de marketing»: las 2 tablas con RLS
  activado (`relrowsecurity = true`).
- Revisión de solo lectura: `mkt_brevo_eventos` y `mkt_campana_cargo` responden 200 (0 filas) con la llave secreta y
  **401 sin llave**.
- Prueba local (servidor en otro puerto, campaña inventada 999999001, correos de example.com):
  - 2 eventos inventados (`delivered` y `soft_bounce` con motivo) → 200, 2 guardados.
  - El mismo envío otra vez → 200, 0 guardados y 2 ignorados (la huella evita duplicados).
  - En la tabla: 2 filas, 1 con motivo. Se borraron (204) y la tabla quedó con 0 filas.
- Script temporal borrado; no se mostraron correos ni llaves.

## 2026-11-20 · .env.example sin valores reales

- Se encontraron 37 valores reales en `.env.example` (también en `origin/main` y en el historial del repo): SAP,
  Workflow, contraseñas maestras, webhooks de Make y llaves públicas de Supabase/Firebase. Ningún valor se anotó.
- En esta rama se dejaron vacíos (solo los nombres). No se trajeron commits de main.
- PENDIENTES: TI debe cambiarlos (Eduardo / TI). CLAUDE.md: revisar `.env.example` antes de cualquier push.

## 2026-11-20 · Ruta del webhook de Brevo (código y pruebas, sin Supabase)

- Ruta `POST /api/marketing/brevo-webhook` (local en `server.ts`, Vercel en `api/marketing/brevo-webhook.js`), con la
  lógica en `server/brevoWebhook.js` y el guardado en `server/mktSupabase.js` (API REST de Supabase, sin paquetes
  nuevos).
- Clave en `BREVO_WEBHOOK_SECRET` (solo servidor; agregada al azar en `.env.local`, nunca mostrada). Se acepta en el
  encabezado `x-webhook-token` o como usuario:clave en la dirección (Basic auth), según lo que permita la pantalla de
  Brevo.
- Respuestas: 405 si no es POST, 401 sin clave correcta (no guarda nada), 400 contenido inválido, 413 demasiado grande,
  429 si falta configuración o Supabase falla (para que Brevo reintente), 200 con conteos. Nunca devuelve correos.
- Huella SHA-256 (evento|campaña|correo|fecha) para ignorar duplicados; eventos de contactos (sin campaña) se ignoran;
  nombres de evento nuevos se guardan igual. No se guarda la URL del clic, la IP, segmentos ni listas.
- 18 pruebas nuevas con datos inventados (25 en total en `server/`), lint y build OK. Prueba local en otro puerto solo
  con peticiones rechazadas (405 y 401): no se llamó a Supabase.
- `.env.example`: nombres vacíos `BREVO_WEBHOOK_SECRET`, `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY`.

## 2026-11-20 · Proyecto Supabase y diseño de las tablas del webhook

- Keily creó el proyecto Supabase «Dashboard Canales de marketing», solo para este dashboard (plan Free: se pausa tras
  una semana sin actividad y no tiene respaldos). Variables de servidor: `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY`.
- Archivo `docs/marketing/v2/sql/001_tablas_webhook.sql` con las tablas `mkt_brevo_eventos` y `mkt_campana_cargo`,
  RLS activado sin reglas y sin permisos públicos. La columna `evento` no se limita (decisión de Keily: un evento con
  otro nombre se guarda igual y se filtra después). Lo corre Keily en el SQL Editor.
- Decisiones: tarea diaria (Vercel cron con `CRON_SECRET`) para que el proyecto no se pause; respaldo por definir;
  eventos 12 meses con limpieza mensual más adelante; datos de prueba en las mismas tablas y borrados al terminar;
  sin URL del clic; rutas con correos solo con totales hasta que haya inicio de sesión real.
- Keily aprobó el plan del webhook (MAILING.md, 10.1 y 10.2).

## 2026-11-20 · Detalle por correo: se usarán los webhooks de Brevo

- Prueba de exportación de destinatarios (`POST /v3/emailCampaigns/74/exportRecipients`, solo rebotes temporales):
  **403 permission_denied** — la llave de solo lectura no permite exportar. No se creó ningún proceso ni se descargó
  nada. Script temporal borrado.
- Decisión de Keily: el detalle por correo (motivo del rebote, CORREGIR / MANTENER) vendrá de los **webhooks de
  marketing** de Brevo, **solo para campañas nuevas**. Las campañas anteriores se mostrarán solo con totales. La llave
  con permiso de escritura queda descartada.
- El webhook lo creará Keily en Brevo, avisando a Ismael.
- PENDIENTES: exportación manual de la campaña 74 (solo nombres de columnas), dónde se guardan los eventos y crear el
  webhook.

## 2026-11-20 · Llave de Brevo y primera prueba de la API

- Se creó la llave dashboard-marketing-lectura (solo lectura: campañas de email y contactos, caduca 2027-11-20). Se
  desactivó en Brevo el bloqueo de IP para claves API porque Vercel cambia de IP; las 6 IP ya autorizadas se dejaron
  igual.
- La llave va en `.env.local` como `BREVO_API_KEY` (solo servidor). Prueba hecha con un script temporal fuera del repo,
  ya borrado; no se guardaron correos ni datos de clientes.
- Resultado:
  - 59 campañas de email: 54 enviadas (`sent`) y 5 borradores (`draft`). Programadas (`queued`): 0 hoy.
  - Las estadísticas por campaña funcionan (`globalStats`, `campaignStats`, enlaces, dominio, dispositivo, navegador).
  - El detalle por contacto trae envío, entrega, rebotes, aperturas y clics con fecha, pero **no el motivo del rebote
    ni la marca de apertura automática de Apple**.
  - 403 esperado en `/v3/smtp/statistics/events` (correos transaccionales, fuera del permiso de la llave).
- Decisión: por ahora se usan los números de `globalStats`; Keily compara la campaña 74 en la pantalla de Brevo.
- Detalle en MAILING.md, sección 10.1.

## 2026-11-20 · Parte 2: sexta sub-pestaña de Mailing «Asignar cargo a campañas»

- Pedida por Eduardo, para Marketing (Ismael): cada campaña de Brevo (nombre, asunto, fecha) con un menú GG / GF / GO
  y un botón Guardar. Solo estructura vacía: aviso «Pendiente de conexión con Brevo», nota «Pendiente: definir dónde
  se guarda la selección» y nota de que solo personas autorizadas podrán guardar. Sin base de datos ni Supabase.
- Regla confirmada por Keily: lo elegido a mano gana sobre lo sugerido por el nombre; sin ninguno, «Sin clasificar».
- PENDIENTES: dónde se guarda el cargo elegido, quién puede editarlo y preguntar a Eduardo por «Sin confirmación».

## 2026-11-20 · Parte 2: estructura del dashboard Canales de marketing (3 pestañas, sin datos)

- Menú: **Marketing → Flujo de ventas · Canales de marketing** (id `marketing-v2`).
- Subtítulo: «Campañas de correo, redes sociales y otros canales · Guatemala y El Salvador».
- **Mailing:** barra de filtros globales deshabilitada (Campaña, Cargo, Asunto, País, Cliente, Desde/Hasta), las 5
  sub-pestañas con sus paneles y tablas vacías («—»), el aviso «Pendiente de conexión con Brevo», el aviso 🔒 de inicio
  de sesión en Correos por corregir, Detalle por correo y Relación con clientes, y el panel «Leads · Próximamente» solo
  en Resultados generales.
- **Redes sociales:** aviso «Pendiente de conexión con Meta». **Otros:** aviso «Próximamente (PBX, web, etc.)».
- Reutiliza los estilos de Flujo de ventas sin modificarlos. Sin datos reales ni inventados, sin llamadas a APIs, sin
  rutas de servidor ni `api/` (eso es la Parte 3).
- Archivos nuevos en `src/modulos/marketing/marketing-v2/`; editado `PortalLayout.tsx`.

## 2026-11-20 · Protección en .gitignore

- Se protegieron en `.gitignore` los Excel, los JSON de llaves y las carpetas locales de editores:
  `*.xlsx` / `*.xls` (y en mayúsculas), `*service-account*.json`, `*credentials*.json`, `*-key*.json`,
  `client_secret*.json`, `.claude/`, `.vscode/` y `.kiro/`. No se usa `*.json` (rompería `package.json` y otros).
- Se comprobó que ningún archivo necesario del proyecto coincide con esos patrones (274 archivos de todas las ramas).

## 2026-11-20 · Reglas permanentes del repositorio

- Se creó `CLAUDE.md` en la raíz con las reglas permanentes: español y explicaciones sencillas, plan y «sí» antes de
  cambiar, Git (sin `main`, sin push/merge/PR sin pedirlo, sin `-D`/`reset --hard`/borrar stash), Supabase solo con
  permiso, llaves y datos privados, qué no tocar y cómo documentar Marketing v2.

## 2026-11-20 · MAILING.md contra los criterios oficiales

- Se comparó MAILING.md con los criterios oficiales (`criterios_mailing.txt`) y con la plantilla HTML anterior
  (`dashboard_mailing_plantilla.html`). Ninguno de los dos se sube al repo (la plantilla trae datos de clientes).
- **Se decidió seguir los criterios en lugar de la plantilla** (Keily): «no such user» pasa a CORREGIR; bloqueos,
  antispam, tiempo de espera, relay, autenticación SMTP, buzón lleno y «message delivery failed» quedan MANTENER
  aunque el rebote sea permanente; se usa el motivo del rebote final (por confirmar con datos reales de Brevo).
- MAILING.md se completó: estado final (empate = «Sin confirmación»), tabla completa de motivos, aperturas, clics
  («CLIC AUTOMÁTICO» no aplica en esta versión), indicadores, semáforo, filtros, las 5 pestañas, cruce con clientes y
  aviso a ejecutivos. Las 3 diferencias con la plantilla quedaron explicadas para Marketing (sección 9).

## 2026-11-20 · Limpieza y rama nueva

### Ramas
- Se borraron **en local** las ramas `feature/marketing-mailing` y `redes-sociales` (`git branch -D`, autorizado por
  Keily). En GitHub ya no existían. Su contenido ya estaba en `main`: los PR #6 y #7 se unieron con *squash*, por eso
  git no las reconocía como unidas y `-d` no las borraba. Se comprobó archivo por archivo antes de borrarlas.
- `retirar-flujo-ventas-viejo`: se le quitó la conexión a `origin/main` (`git branch --unset-upstream`) para que un
  push desde ella no pueda ir a `main`. **No se borró.** Su contenido ya está en `main` (PR #2).
- Se creó `feature/marketing-v2` desde `main` (`a9aebe0`), **sin** seguir a `origin/main`.

### Commit `9d08356` · limpieza
Se quitó todo lo de los 3 dashboards que reemplaza este (ver [README](README.md#qué-reemplazó)).

**74 archivos borrados:**
- Marketing por canales: `src/modulos/marketing/canales/`, `server/marketingCanales/`, `server/marketingMailing.js`,
  `server/marketingMailingDetalle.js` (+ prueba), `api/marketing/mailing.js`, `api/marketing/mailing-detalle.js` y
  `docs/marketing-canales/`.
- Redes sociales: `src/modulos/marketing/redes/`, `server/marketingRedes.js`, `server/marketingRedes/` (con el Excel y
  sus pruebas), `api/marketing/redes.js` y `docs/marketing-redes/`.
- Campañas de correo: `public/dashboards/marketing/mailing-campanas.html` y `public/assets/css/mailingCampanas.css`.

**5 archivos editados:**
- `src/components/layout/PortalLayout.tsx`: el menú de Marketing queda solo con **Flujo de ventas**. El portal
  ahora abre en **Ingresos acumulados** (antes abría en «Campañas de correo», que ya no existe).
- `server.ts`: sin las rutas `/api/marketing/mailing`, `/api/marketing/mailing-detalle` y `/api/marketing/redes`.
- `vercel.json`: sin el `includeFiles` de redes.
- `.env.example`: sin `MARKETING_LOCAL_CSV_DIR`, `GOOGLE_SERVICE_ACCOUNT_JSON` y `MARKETING_DRIVE_FOLDER_ID`.
- `public/assets/js/dashboards.js`: sin la entrada `mailing-semanal`.

**No se tocó lo compartido:** `estandar.css`, `dashboard.css`, `flujoVentas.css`, `estandar.js`, `reporte-pdf.js`,
los paquetes `xlsx` / `lucide-react` / `react` y `docs/marketing/` (Flujo de ventas).

**Comprobado:** pruebas, lint y build OK. En local cargan Servicio al Cliente, Flash de altas, Bodega y la API de
Flujo de ventas (Prospekt).

### Variables de Vercel que se quitarán al publicar (solo nombres)
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `MARKETING_DRIVE_FOLDER_ID`
- `MARKETING_LOCAL_CSV_DIR`
- `MARKETING_DETALLE_CLAVE` (si todavía existe; el código ya no la usaba)

Se **quedan**: `BREVO_API_KEY` (la usará Mailing) y `RED_API_KEY` (Flujo de ventas).

### Documentación
- Se creó esta carpeta `docs/marketing/v2/` con README, BITACORA, MAILING, REDES y PENDIENTES.
