# Pendientes · Marketing v2

Cuando algo se resuelva, se cambia el **Estado** y se anota en [BITACORA.md](BITACORA.md) con la fecha.

| Pendiente | A quién se le pidió | Fecha | Estado |
|---|---|---|---|
| Código de verificación para crear la llave de Brevo | Ismael / Laura (llega a mercadeo@red.com.sv) | 2026-11-20 | Resuelto (2026-11-20) |
| Confirmar si la API de Brevo trae campañas programadas | Keily (prueba con la llave) | 2026-11-20 | Resuelto: sí, con el estado `queued` (MAILING.md, 10.1) |
| Renovar la llave de Brevo antes del 2027-11-20 | Keily | 2027-11-01 | Pendiente |
| Dónde sacar el motivo del rebote por destinatario (la API de lectura no lo trae): probar la exportación de destinatarios o los webhooks | Keily | 2026-11-20 | Resuelto: exportación con 403 (llave de solo lectura); llave con escritura descartada; se usarán los webhooks de marketing, solo para campañas nuevas (MAILING.md, 10.1) |
| Exportar a mano en Brevo la campaña 74 (solo rebotes temporales) y pasar solo los nombres de las columnas, sin valores | Ismael | Por confirmar | Pendiente |
| Decidir dónde se guardan los eventos del webhook de Brevo (Supabase u otro) | Keily | 2026-11-20 | Resuelto: proyecto Supabase «Dashboard Canales de marketing», solo para este dashboard (plan Free: se pausa tras una semana sin actividad y no tiene respaldos). Variables de servidor: `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY` |
| Crear el webhook de marketing en Brevo, avisando a Ismael | Keily | 2026-11-23 | Resuelto: «Dashboard Canales de marketing», tipo Marketing email, activo, apuntando a la versión de prueba de `dashboard.centralizado.interno`; primer evento real recibido |
| Cambiar la dirección del webhook en Brevo a producción (sin bypass) cuando se publique | Keily | Al publicar | Pendiente |
| Correr `docs/marketing/v2/sql/001_tablas_webhook.sql` en el proyecto «Dashboard Canales de marketing» | Keily | 2026-11-20 | Resuelto: 2 tablas con RLS; con llave secreta 200 y sin llave 401 |
| Tarea diaria para que el proyecto Free no se pause (Vercel cron con `CRON_SECRET`; solo corre en producción) | Keily | Después de probar el webhook | Pendiente |
| Prueba local real de la ruta del webhook: 2 eventos inventados, revisar que se guarden y borrarlos (con el «sí» de Keily, después de correr el SQL) | Keily | 2026-11-20 | Resuelto: 2 guardados, el reenvío se ignoró (sin duplicados), borrados; tabla en 0 |
| Poner en Vercel `BREVO_WEBHOOK_SECRET`, `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY` (Preview y después Production) | Keily | 2026-11-23 | Preview hecho (las 3 como Secret, solo Preview); Production pendiente al publicar (hoy ninguna de las 3 está en Production) |
| Confirmar en cuál de los 2 proyectos de Vercel (`dashboard.centralizado` o `dashboard.centralizado.interno`) se hace la prueba del webhook y se pusieron las variables | Keily | 2026-11-23 | Resuelto: `dashboard.centralizado.interno` (variables de Preview y código de bypass «prueba-webhook-brevo» ahí) |
| Preguntar a Eduardo para qué es el proyecto de Vercel `dashboard.centralizado` (también arma versiones de prueba de este repo) | Eduardo | Por confirmar | Pendiente |
| Versión de prueba: la ruta del webhook pasa la protección y la clave, pero responde 429 al guardar. Revisar en Vercel el mensaje «[Brevo webhook] no se pudo guardar» y las variables `MKT_SUPABASE_URL` / `MKT_SUPABASE_SECRET_KEY` de Preview | Keily | 2026-11-23 | Resuelto: las variables de Supabase estaban en Production y no en Preview; Keily las pasó a solo Preview e hizo Redeploy. Prueba repetida: 2 guardados, reenvío ignorado, borrados |
| Al crear el webhook en Brevo, ver si la pantalla permite el encabezado `x-webhook-token` o solo usuario:clave en la dirección | Keily | 2026-11-23 | Resuelto: autenticación Básica (usuario «brevo», contraseña = `BREVO_WEBHOOK_SECRET`) y encabezado `x-vercel-protection-bypass`; la dirección no lleva claves |
| Definir el respaldo de los eventos del webhook | Keily | Por definir | Pendiente |
| Limpieza mensual de eventos con más de 12 meses | Keily | Más adelante | Pendiente |
| Inicio de sesión real del portal (hasta entonces, las rutas con correos devuelven solo totales) | Keily | 2026-11-23 | Cambió: por decisión de Keily se muestran correos sin inicio de sesión (DECISIONES.md); el inicio de sesión queda para después |
| Opción B (sesión para Marketing): pendiente, decidir después | Keily | Por definir | Pendiente |
| Informar a Eduardo que los correos se muestran sin inicio de sesión | Keily | — | Pendiente |
| Conflicto vite/esbuild en instalación limpia: revisar antes de publicar. Causa: Vercel instala con **bun** (hay `bun.lock` en el repo), que tolera el conflicto; con `npm` limpio falla (vite 8.3.8 pide esbuild 0.27/0.28 y el portal fija 0.25). `bun.lock` ya incluye `pg` (23/11/2026) | Keily | Antes de publicar | Pendiente |
| Poner CC_DB_PASSWORD en Vercel Preview (solo rama feature/marketing-v2) | Keily | Antes de probar en Preview | Pendiente |
| Confirmar si se ocultan las campañas de prueba | Ismael | Por confirmar | Pendiente |
| Comparar en la pantalla de Brevo la campaña 74 (157 entregados, 44 aperturas, 3 clics) para decidir entre `globalStats` y `campaignStats` (por ahora se usa `globalStats`) | Keily | 2026-11-23 | Resuelto: se usa `globalStats`; `uniqueViews` = «Aperturas (incluye automáticas)», Apple MPP aparte (MAILING.md, sección 6) |
| Poner `BREVO_API_KEY` en Vercel (Preview para probar la ruta de campañas; Production al publicar) | Keily | 2026-11-23 | Hecho: la llave nueva (dashboard-marketing-lectura) está solo para la rama `feature/marketing-v2` en Preview |
| En Vercel ya existe una `BREVO_API_KEY` **vieja** (Production y Preview) que Keily no puso. Ningún código de `origin/main` la lee: solo aparece como nombre en `.env.example`, `Dockerfile`, `docker-compose.yml`, documentación vieja y un texto de `SecretsModal.tsx`. Confirmar de quién es y si se puede borrar (y la llave en Brevo, si ya no se usa). Al publicar, Production debe quedar con la llave nueva | Keily / Eduardo | Antes de publicar | Pendiente |
| Confirmar con la campaña de prueba qué es el evento `proxy_open` (¿apertura automática de Apple?) para clasificar APERTURA AUTOMÁTICA por destinatario | Keily | Con la campaña [PRUEBA] | Pendiente: tampoco llegó con la campaña [PRUEBA] (id 80, 23/11). El webhook está suscrito a «cargado por proxy»; se revisa otra vez el 24/11 |
| Segunda revisión de la campaña [PRUEBA] (id 80): clics (Brevo 2 personas, tabla 1 persona con 2 clics) y `proxy_open` | Keily (avisa a Claude) | 2026-11-24 | Pendiente |
| Borrar de la tabla los eventos de la campaña [PRUEBA] (id 80) al terminar la prueba | Keily | Al terminar la prueba | Pendiente |
| Acceso a Meta: Business Manager, páginas por marca y país, cuentas de anuncios | Erick / Ismael | 2026-11-20 | Pendiente |
| Acceso al CRM o bot de leads | Ismael | Por confirmar | Pendiente |
| Permiso de lectura de la base de Cumplimiento de Clientes | Keily | 2026-11-23 | Resuelto: SOLO LECTURA con la contraseña de la base (`CC_DB_PASSWORD`) y candados (MAILING.md, sección 8) |
| Aviso por correo a cada ejecutivo con sus correos por corregir (plazo de 48 horas; borrador, sin envío automático) | Keily | Por definir | En curso: ventana por ejecutivo y correo con diseño listos (borrador .eml, copiar con formato y correo simple; sin envío automático); esperando la revisión de Keily |
| Regla de nombres de campaña entregada a Marketing | Ismael / Laura | Por confirmar | Pendiente |
| Enlace «IR A CORREGIR» desactualizado; el correcto es https://cumplimientoclientes-88n2.onrender.com | Ismael | Por confirmar | Resuelto (2026-11-23): Keily confirmó el enlace; se usa en el botón y en el texto del correo |
| Definición de «lectura» e indicadores de Redes | Ingeniero | Por confirmar | Pendiente |
| Correo del lead en la API de Prospekt | Equipo Prospekt IA | Por confirmar | Pendiente |
| Explicar a Marketing las diferencias de clasificación con la plantilla (MAILING.md, sección 9) | Ismael / Laura | Por confirmar | Pendiente |
| Rediseño de la pestaña Mailing como la referencia visual negra (5 pasos: estilos y tarjetas, gráficas, comparar, correos por corregir con ventana y correo con diseño, detalle y clientes) | Keily | 2026-11-23 | En curso: pasos 1 y 2, Correos por corregir y Comparar hechos (commits); asunto arriba, Comparar como la maqueta, barra de filtros, PDF y tarjetas compactas listos, esperando la revisión de Keily |
| Preguntar a Ismael si la campaña #74 fue solo para El Salvador (de 169 destinatarios, 146 son de clientes de SV y solo 2 de GT) | Ismael | 2026-11-23 | Pendiente |
| Revisar con Ismael la lista de objetivos y sus reglas (8 objetivos creados por Keily el 23/11/2026; DECISIONES.md) | Ismael | 2026-11-23 | Pendiente |
| Correr `docs/marketing/v2/sql/004_objetivo_campana.sql` en el proyecto «Dashboard Canales de marketing» (objetivo como texto libre) | Keily | 2026-11-23 | Resuelto (2026-11-23): objetivo (text) y objetivo_asignado_en (timestamptz) creados, cargo opcional; el servidor ya lee la columna (HTTP 200) |
| Poner `MKT_CLAVE_EDICION` (clave de Marketing para Guardar cargo y objetivo) en `.env.local`, luego en Vercel Preview y al publicar en Production; compartirla solo con Marketing | Keily | 2026-11-23 | Pendiente |
| Borrar `.git/worktrees/wt` (registro de una copia temporal de la rama) con `git worktree prune` cuando OneDrive lo libere; hoy da «permiso denegado». No afecta la rama | Keily / Claude | Cuando OneDrive lo libere | Pendiente |
| Decidir dónde se guarda el cargo elegido por campaña (Supabase u otro) | Keily | — | Pendiente |
| Confirmar con Ismael quién puede editar los cargos | Ismael | Por confirmar | Pendiente |
| Preguntar a Eduardo si el estado «Sin confirmación» se quita del dashboard o se deja (en la reunión dijo que no debería existir) | Eduardo | Por confirmar | Pendiente |
| Quitar de Vercel las 4 variables viejas | Keily / TI | Al publicar | Pendiente |
| Valores reales en .env.example del historial del repo (SAP, Workflow, contraseñas maestras, webhooks de Make, llaves públicas de Supabase/Firebase) (también en origin/main hoy), y llave tipo Google escrita directo en `src/config/env.ts`; además, una contraseña escrita directo en `src/context/AuthContext.tsx` (usuario semilla) y las contraseñas `VITE_MASTER_*`, que llegan al navegador. Nota: el login del portal acepta cualquier usuario y contraseña (no se verifica en el servidor): TI debe cambiarlos | Eduardo / TI | 2026-11-20 | Pendiente |
| Vaciar .env.example en main con un PR aparte y pequeño | Keily (con OK de Eduardo) | — | Pendiente |
| Borrar el código de bypass de Vercel al terminar la prueba del webhook | Keily | — | Pendiente |
| Confirmar con Eduardo si las rutas de totales de Mailing pueden quedar abiertas en producción hasta tener inicio de sesión real | Eduardo | Antes de publicar | Pendiente |
| Carga inicial única del historial: exportar desde Brevo los CSV de las campañas reales anteriores e importarlos a mkt_brevo_eventos (paso aparte, después de las pantallas) | Keily | 2026-11-23 | En curso: 74, 75 y 76 cargadas (1 076 eventos, MAILING.md 10.3); siguen 1, 2, 3, 68 y 71 y después las demás reales |
| Correr `docs/marketing/v2/sql/002_historial_importado.sql` (columnas origen, cantidad y fecha_aproximada) | Keily | 2026-11-23 | Resuelto: las 3 columnas creadas |
| Preguntar a Ismael si las campañas 77, 78 y 79 («2da Campaña Validación – GG/GF/GO – Nov19») se enviaron a clientes reales; si sí, sacarlas del filtro de prueba e incluirlas en el historial | Keily / Ismael | Por confirmar | Pendiente |
| Exportar desde Brevo los CSV de las otras campañas reales: primero 1, 2, 3, 68 y 71; después 70, 42, 41, 40, 39, 38, 37, 36, 35, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21 y 20 | Keily | — | Pendiente |
| Hueco del historial: aperturas y clics entre la exportación del CSV (16/11) y la activación del webhook (23/11) no están en ninguna fuente (no cambia estado final ni CORREGIR) | Keily | — | Informativo |

Las 4 variables viejas (solo nombres): `GOOGLE_SERVICE_ACCOUNT_JSON`, `MARKETING_DRIVE_FOLDER_ID`,
`MARKETING_LOCAL_CSV_DIR` y `MARKETING_DETALLE_CLAVE`.
