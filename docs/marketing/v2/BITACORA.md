# Bitácora · Marketing v2

Diario del trabajo del dashboard nuevo de Marketing. Lo más reciente va arriba.

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
