# Bitácora · Marketing v2

Diario del trabajo del dashboard nuevo de Marketing. Lo más reciente va arriba.

## 2026-11-23 · Campaña [PRUEBA] Webhook dashboard (id 80): primera revisión

- Keily envió la campaña autorizada por Ismael a 4 destinatarios internos (1 dirección inexistente a propósito) y
  pidió abrirla y dar clic. Revisión de solo lectura a los ~8 minutos (solo conteos, correos tapados).
- Brevo: enviados 4 · entregados 2 · soft 1 · hard 1 · aperturas 2 (Apple MPP 0) · clics 2.
- Tabla (todo con `origen = 'webhook'`): 9 eventos de 4 destinatarios — entregados 2, soft 1, hard 1, aperturas
  3 eventos de 2 personas, clics 2 eventos de **1** persona. Demora entre el evento y su llegada: 2 a 9 segundos.
- Motivos reales (correo tapado): hard «550 5.1.1 [correo] does not exist» → CORREGIR · Cuenta destinataria
  inexistente; soft «452-4.2.2 … inbox is out of storage space … OverQuotaTemp … gsmtp» → MANTENER · Buzón lleno.
  Las reglas clasifican bien los dos. Confirma que el texto del motivo **puede traer el correo**: en pantalla solo
  se muestra el motivo técnico.
- `proxy_open`: no llegó ninguno.
- Diferencia por revisar mañana: Brevo cuenta 2 personas con clic; en la tabla los 2 clics son de la misma persona.

## 2026-11-23 · Webhook de marketing creado en Brevo y primera revisión

- Keily creó el webhook en Brevo: nombre «Dashboard Canales de marketing», tipo Marketing email, activo. Dirección:
  la versión de prueba de la rama en `dashboard.centralizado.interno`, **sin claves en la dirección**. Autenticación
  Básica (usuario «brevo», contraseña = `BREVO_WEBHOOK_SECRET`) y encabezado `x-vercel-protection-bypass` con el
  código de bypass. Eventos: entregadas, abierto, clicado, soft bounce, hard bounce, queja, suscripción cancelada y
  cargado por proxy (sin los de contactos). Avisó a Ismael.
- Revisión de solo lectura (~15 min después, solo conteos): llegó **1 evento real** por el webhook, una apertura de la
  campaña 79 (2da Campaña Validación - GO), guardada con `origen = 'webhook'`. Todavía no llegó ningún `proxy_open`.
  El resto de la tabla es el historial importado de 74, 75 y 76.
- Siguiente: campaña [PRUEBA] Webhook dashboard – 2026-11-23 (autorizada por Ismael) para ver entregas, rebotes con
  motivo, aperturas, clics y qué es `proxy_open`.

## 2026-11-23 · Carga inicial del historial: campañas 74, 75 y 76

- Keily corrió `sql/002_historial_importado.sql`: columnas `origen`, `cantidad` y `fecha_aproximada`.
- Los 3 CSV de Brevo (fuera del repo) traen motivo de rebote y aperturas Apple MPP por persona; fechas en hora de
  Guatemala. No traen la fecha del clic (se importa con fecha aproximada, decisión de Keily).
- Prueba en seco y carga real con un script temporal fuera del repo (ya borrado; los CSV nunca entraron al repo):
  **1 076 eventos** guardados con `origen = 'historial'`; la segunda corrida agregó **0**.
- Revisión (solo conteos): estado final igual a Brevo (74: 157 / 12 / 0 · 75: 308 / 37 / 26 · 76: 254 / 33 / 27);
  CORREGIR 6 + 49 + 46 = **101**; apertura registrada 28 / 62 / 57 y automática (Apple) 10 / 17 / 16. La ruta de
  resumen responde sin `@`. Hubo además **1 evento real del webhook** (apertura de la campaña 79).
- Código: la ruta de resumen cuenta la apertura automática (`apple_mpp` sin `opened`) y el origen de los eventos;
  lecturas de Supabase con 20 s de espera (la primera consulta, con el proyecto «dormido», pasó de 8 s).
  Textos de la pantalla: «historial importado o webhook». 78 pruebas, lint y build OK.
- Campañas 77, 78 y 79 siguen como prueba hasta que Ismael confirme si fueron a clientes reales (PENDIENTES).

## 2026-11-23 · Datos reales de Mailing · Paso 4: filtros y Resultados generales

- Consulta de solo lectura: en `origin/main` ningún código lee `BREVO_API_KEY`; solo aparece como nombre
  (`.env.example`, `Dockerfile`, `docker-compose.yml`, documentación vieja y un texto de `SecretsModal.tsx`). En Vercel
  hay una `BREVO_API_KEY` vieja (Production y Preview) que no puso Keily; la nueva está solo para la rama
  `feature/marketing-v2` (PENDIENTES).
- Pantalla (`pantalla/Mailing.jsx`): filtros que funcionan (Campaña, Cargo, Asunto, Desde/Hasta en hora de Guatemala y
  «Mostrar campañas de prueba», apagado por defecto); País y Cliente apagados hasta el cruce con clientes.
- «Resultados generales» con datos reales: franja de 6 indicadores, recorrido, incidencias (4 estados), tasa de
  entrega con semáforo, correos por corregir (solo con datos del webhook), análisis por cargo, tabla por campaña y
  aviso «disponible para campañas enviadas después de activar el webhook». Aperturas «incluye automáticas» con Apple
  MPP aparte.
- Datos: `datos/useMailingDatos.js` (pide a nuestras rutas) y `datos/calculos.js` (filtros y sumas; usa las reglas de
  `server/mailing/reglas.js`, una sola fuente). Estilo: piezas de Flujo de ventas solo importadas (franja, paneles,
  tablas, insignias, dona, barras) + clases `mkv2-` nuevas en `marketing-v2.css`, solo con variables `--fv2-*`.
- 8 pruebas nuevas de los cálculos con campañas inventadas (73 en total), lint y build OK.
- **Rediseño pedido por Keily (antes del commit; adelanta los pasos 5 y 6):**
  - Forma visual tomada de la plantilla de Mailing de Marketing (solo como referencia de tarjetas, títulos y
    gráficos; la plantilla **no** se copió al repo porque trae datos de clientes), con los colores del portal.
  - Indicadores como tarjetas separadas (número grande, nombre corto, nota), cuadrícula 6 / 3 / 2 según el ancho.
    Indicadores secundarios: Sin confirmación, Correos por corregir, Bajas y Marcados como spam (`unsubscriptions` y
    `complaints` de Brevo, agregados a `totalesDesdeBrevo`).
  - Las 6 sub-pestañas se abren y muestran contenido: Comparar campañas (barras por métrica y tabla ordenable con
    datos reales), Asignar cargo (lista real con cargo sugerido; Guardar deshabilitado), Correos por corregir y
    Detalle por correo (estructura completa con conteos del webhook, nunca correos; «—» mientras no haya datos) y
    Relación con clientes (estructura con el aviso del cruce pendiente). Ningún número inventado.
  - Código en `pantalla/mailing/` (piezas, Filtros, Generales, Comparar, Correos, Clientes, Cargos); `Mailing.jsx`
    solo arma la pantalla. Revisado fuera del portal con capturas (sin iniciar sesión).
  - 75 pruebas en total (server y cálculos de la pantalla), lint y build OK.
- **Segundo ajuste (dinámico como la plantilla):**
  - Tarjetas como las de la plantilla: título en mayúsculas, número grande, porcentaje con su base, línea que explica
    qué es y enlace «Ver destinatarios» / «Ver rebotes» / «Ver lista». Bloques con título («Entregas, rebotes y
    calidad de contactos», «Recorrido e incidencias», «Cargos y campañas»).
  - Todo clicable: cada tarjeta, etapa del recorrido, estado de incidencias y la dona abren la sub-pestaña que
    corresponde ya enfocada (franja «Detalle del indicador · …» con «Ver todos» y «Volver a resultados»). Clic en un
    cargo o una campaña de las tablas filtra todo el dashboard. «Detalle por correo» muestra el total de Brevo del
    estado elegido y el conteo del webhook; nunca correos.
  - Los filtros cambian todas las tarjetas, gráficos y tablas al momento, en todas las sub-pestañas.
  - «Entregados» en color fijo (el semáforo solo en la tasa de entrega); «—» siempre en gris; número y «%» sin
    separarse; «Sin confirmación» avisa cuando con los totales de Brevo no se puede calcular exacto.
  - Prueba de clics automática y temporal sobre la pantalla real con datos reales (archivos de prueba borrados, sin
    iniciar sesión): todos los clics llevan a donde deben, el filtro Cargo = GG cambia las tarjetas (335 enviados),
    sin `@` en pantalla y sin «—» en rojo. 77 pruebas, lint y build OK.

## 2026-11-23 · Datos reales de Mailing · Paso 3: ruta de resumen de los eventos del webhook

- Ruta `GET /api/marketing/mailing/resumen` (`server/mailing/resumen.js`, `api/marketing/mailing/resumen.js`,
  `server.ts`), con `?campanas=` opcional. Lee `mkt_brevo_eventos` página por página (`leerEventos` en
  `server/mktSupabase.js`), agrupa por destinatario dentro del servidor y devuelve **solo conteos**: estados finales,
  CORREGIR / MANTENER con motivos técnicos, apertura registrada, `proxy_open` aparte, clic, spam, bajas y eventos
  nuevos. Nunca correos. Caché de 2 min; copia anterior con aviso si Supabase falla.
- 9 pruebas nuevas con eventos inventados (65 en total en `server/`), lint y build OK.
- Revisión real (portal local): con la tabla vacía responde 200 «Sin datos del webhook todavía.»; POST 405;
  parámetro inválido 400.
- Keily pone `BREVO_API_KEY` en Vercel solo en Preview. Las 4 campañas reales «Sin clasificar» se asignarán a mano.

## 2026-11-23 · Datos reales de Mailing · Paso 2: ruta de campañas con totales de Brevo

- Ajustes al paso 1 (decisión de Keily): «GERENTE FINACIERO» → GF y «GERENTE OPERACIONES» → GO. Apertura con totales:
  `uniqueViews` = «Aperturas (incluye automáticas)», con «Apple MPP» aparte y sin restar (Keily comparó la campaña 74
  en Brevo: Entregados 157, Aperturas 45, Apple MPP 11, Total de aperturas 62, Clics 3).
- Revisión de solo lectura: la **lista** de campañas trae `globalStats` en una sola llamada. La API **no trae** los
  motivos de rebote agrupados por campaña que muestra la pantalla de Brevo: para campañas viejas solo la carga inicial
  del historial podrá traerlos.
- Ruta `GET /api/marketing/mailing/campanas` (`server/mailing/campanas.js`, `api/marketing/mailing/campanas.js`,
  `server.ts`): enviadas y programadas, cargo manual desde `mkt_campana_cargo`, caché de 10 min, copia anterior si
  Brevo falla, sin datos personales. `vercel.json`: 60 s de tiempo máximo.
- 11 pruebas nuevas con datos inventados (56 en total en `server/`), lint y build OK.
- Revisión real (portal local, solo conteos): 54 campañas enviadas y 0 programadas; 23 de prueba y 31 reales
  (9 GG, 9 GF, 9 GO, 4 «Sin clasificar»); semáforo 15 verde, 13 amarillo, 26 rojo; campaña 74 igual a la pantalla de
  Brevo; respuesta sin `@`. Primera carga 9,5 s; con caché 0,1 s.

## 2026-11-23 · Datos reales de Mailing · Paso 1: reglas oficiales en código

- Plan aprobado por Keily: conectar Mailing en 6 pasos (reglas, ruta de campañas, ruta de resumen, Resultados
  generales, Comparar y Asignar cargo, Correos por corregir y Detalle), un commit por paso.
- `server/mailing/reglas.js` (sin conexiones): cargo y sector desde el nombre, cargo final (a mano gana), campañas de
  prueba, estado final, CORREGIR / MANTENER con la tabla de motivos, apertura y clic, porcentajes, totales desde
  `globalStats`, tasas y semáforo de entrega.
- Decisiones de Keily: el cargo también se deduce de «GERENTE DE FINANZAS», «GERENTE FINANZAS», «G.G», «G.F», «G.O» y
  «- GG -» / «- GF -» / «- GO -»; lo demás queda «Sin clasificar». Apertura con totales = `uniqueViews` «por
  confirmar». Campañas de prueba: TEST, VALIDACIÓN o PRUEBA, ocultas por defecto. Las rutas de totales pueden quedar
  abiertas por ahora (confirmar con Eduardo antes de publicar).
- El semáforo usa los números exactos (no el porcentaje redondeado).
- 20 pruebas nuevas con datos inventados (45 en total en `server/`), lint y build OK.

## 2026-11-23 · Webhook funcionando en la versión de prueba (dashboard.centralizado.interno)

- Causa del 429 anterior: `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY` estaban en Production y no en Preview. Keily
  las pasó a solo Preview e hizo Redeploy.
- Prueba repetida (campaña inventada 999999003, correos de example.com):
  - Sin bypass de Vercel: 302. Con bypass y sin nuestra clave: **401** ✔.
  - Con la clave correcta y 2 eventos (`delivered` y `hard_bounce` con motivo): **200, 2 guardados** ✔.
  - El mismo envío otra vez: 200, 0 guardados y 2 ignorados (la huella evita duplicados) ✔.
  - En la tabla: 2 filas, 1 con motivo. Borradas (204); la tabla quedó en 0.
- Script temporal borrado; no se mostraron correos ni llaves.
- Siguiente: crear el webhook en Brevo (Keily, avisando a Ismael) apuntando a la versión de prueba y mandar una
  campaña de prueba.

## 2026-11-23 · Prueba del webhook en la versión de prueba de Vercel (resultado parcial)

- La prueba se hace en el proyecto de Vercel **`dashboard.centralizado.interno`**: ahí están las 3 variables de Preview
  y el código de bypass «prueba-webhook-brevo» (guardado por Keily en `.env.local` como `VERCEL_BYPASS_SECRET`; nunca
  se mostró). El otro proyecto, `dashboard.centralizado`, también arma versiones de este repo: hay que preguntarle a
  Eduardo para qué es.
- Resultado (campaña inventada 999999002, correos de example.com):
  - Sin bypass de Vercel: 302 (inicio de sesión de Vercel). Con bypass: GET 405.
  - POST sin nuestra clave y con clave incorrecta: **401** ✔.
  - POST con la clave correcta y 2 eventos: **429** «No se pudo guardar». La clave de Preview coincide, pero el
    guardado en Supabase falló. En la tabla quedaron 0 filas (se corrió el borrado igual: 204, tabla en 0).
  - Los valores de `.env.local` están bien escritos (sin comillas ni espacios): la causa más probable está en cómo
    quedaron `MKT_SUPABASE_URL` o `MKT_SUPABASE_SECRET_KEY` en Preview. Se revisa con el registro de Vercel.
- Script temporal borrado; no se mostraron correos ni llaves.

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
