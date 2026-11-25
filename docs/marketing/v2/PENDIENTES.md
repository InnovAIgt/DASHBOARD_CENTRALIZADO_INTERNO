# Pendientes · Marketing v2

Aquí solo queda lo que **depende de otros** (Ismael, Eduardo, Marketing, el ingeniero, TI, Prospekt IA) o de la
**publicación en producción**. Lo resuelto y las tareas que son solo de Keily están en [BITACORA.md](BITACORA.md)
(entrada del 2026-11-23 «Mailing terminado»). Cuando algo se resuelva, se quita de aquí y se anota en la bitácora con
la fecha.

## Ismael / Marketing

| Pendiente | A quién se le pidió | Fecha | Estado |
|---|---|---|---|
| Exportar a mano en Brevo la campaña 74 (solo rebotes temporales) y pasar solo los nombres de las columnas, sin valores | Ismael | Por confirmar | Pendiente |
| ¿La campaña 70 («DASHBOARD CAMPAIGN OCT 23», 36 destinatarios, 23/10) fue real o de prueba? Su CSV está listo pero no se cargó; si fue real, se carga | Ismael | 2026-11-24 | Pendiente |
| ¿La campaña #74 fue solo para El Salvador? (de 169 destinatarios, 146 son de clientes de SV y solo 2 de GT) | Ismael | 2026-11-23 | Pendiente |
| Revisar la lista de objetivos y sus reglas (8 objetivos creados por Keily el 23/11/2026; DECISIONES.md) | Ismael | 2026-11-23 | Pendiente |
| Confirmar quién puede editar el cargo y el objetivo (y recibir la clave de Marketing) | Ismael | Por confirmar | Pendiente |
| Regla de nombres de campaña entregada a Marketing | Ismael / Laura | Por confirmar | Pendiente |
| Explicar a Marketing las diferencias de clasificación con la plantilla (MAILING.md, sección 9) | Ismael / Laura | Por confirmar | Pendiente |
| Acceso al CRM o bot de leads | Ismael | Por confirmar | Pendiente |
| Acceso a G24 para la calificación de leads (¿quién lo administra?) | Ismael | Por confirmar | Pendiente |
| Códigos por publicación para unir cada lead con su publicación (Redes) | Ismael + equipo Prospekt IA | Por confirmar | Pendiente |
| Leads · pedir que **Prospekt guarde el correo del lead siempre que exista**, para poder cruzarlo con las campañas (hoy solo 29 de 291 calificados lo traen) | Ismael → equipo Prospekt IA | 2026-11-24 | Pendiente |
| Leads · hay leads «PostIAlo Mailing» de **junio y julio de 2026**, antes de las campañas de esta cuenta de Brevo (empiezan en agosto). ¿Hubo otra cuenta o herramienta de correo, o el origen está mal anotado? | Ismael | 2026-11-24 | Pendiente |
| Leads · hay **contactos que fueron leads antes de recibir campañas** (4 leads con correo en campañas enviadas 126 a 163 días después). ¿Se agregan los leads a la base de correos? Si es así, esos casos no cuentan como leads de campaña | Ismael | 2026-11-24 | Pendiente |
| Leads · **fuente de teléfonos** de los destinatarios de las campañas (sin ella, el cruce exacto es solo por correo) | Ismael / Marketing | 2026-11-24 | Pendiente |
| Leads · agregar `validator_source` y `pais` a `/api/audit/leads-no-calificados` (sin eso, los no calificados no se pueden mostrar por campaña) | Administrador de Prospekt IA | 2026-11-24 | Pendiente |
| Leads · confirmar si el status «cerrado» / etapa 6 es **venta ganada** | Administrador de Prospekt IA / Ismael | 2026-11-24 | Pendiente |
| Redes · acceso total de Keily a «Negocio de Red Intelfon» (Administradora) **o** los códigos de la cuenta de Laura; y la lista marca → país → página de Facebook → Instagram → cuenta publicitaria (REDES.md, sección 3) | Erick (o Laura) | 2026-11-20 | Pendiente |
| Redes · crear la app de Meta (tipo Empresa), el usuario del sistema de solo lectura y su token; poner `META_TOKEN`, `META_APP_SECRET` y `META_API_VERSION` en .env.local y en Vercel (Secret). Las partes (1), (2) con datos reales, (4) Facebook y (6) esperan este token | Keily | 2026-11-24 | Hecho: token de usuario (app «Automatizacion RRSS RED») en .env.local y en Vercel Preview y Production; probado en la parte (1) (REDES.md, 7.1) |
| Redes · ¿Marketing tiene un **plan de publicaciones programadas**? ¿En qué formato (Excel, calendario, Meta Business Suite)? Si no hay plan, no se hace «Plan del mes» (REDES.md, secciones 4 y 8) | Ismael | 2026-11-24 | Pendiente |
| Redes · ¿Programan desde Meta Business Suite? (para saber si la API de Facebook `scheduled_posts` las verá; se prueba en la parte (1)) | Ismael | 2026-11-24 | Pendiente: `scheduled_posts` sí se lee en las 3 páginas, pero hoy hay 0 programadas; programar una de prueba para confirmar que aparece |
| Redes · fase 2 (solo anotado): lo de Ismael (edad, sexo, horarios, CTR, segmentaciones y presupuestos) y leads; se planea después de publicar la fase 1 | Ismael | 2026-11-24 | Para después |
| Confirmar si hay anuncios pagados fuera del Business Manager (agencia o cuenta personal) y quién programa las publicaciones y con qué herramienta | Marketing (Erick / Ismael) | Por confirmar | Pendiente |
| Confirmar la lista de páginas, cuentas de Instagram y cuentas de anuncios que vea el token de Meta (la parte (1) las lista primero) | Marketing, con Keily | Cuando exista el token | En curso: están las 3 páginas y sus 3 Instagram (REDES.md, 7.1). Faltan las cuentas publicitarias (fila siguiente) |
| Redes · cuentas publicitarias: confirmar **a qué marca va cada cuenta**, si `act_1657231285337963` (GTQ, asignada al usuario, con nombre de persona) **es de la empresa**, y si existe una cuenta publicitaria de **«RED Intelfon Guatemala»** a la que el token no tiene acceso. Mientras tanto se usa solo `act_2035747430056013` (USD, «Negocio de Red Intelfon») | Marketing (Erick / Ismael) | 2026-11-24 | Averiguado con el token (REDES.md, 7.2): la USD es del negocio y promociona RED SV (81 anuncios) y DATA RED (2); la GTQ es personal, sin gasto ni campañas (queda fuera); el negocio GT no tiene cuentas ni páginas. Falta que Keily apruebe la propuesta de 7.2 |
| Redes · ¿**RED GT** hace pauta pagada en otro lado? El token no ve ningún anuncio de RED GT. Podría venir de la **cuenta publicitaria del negocio «RED Intelfon Guatemala»** que se ve en el Administrador de anuncios (el token no la ve: el negocio le devuelve 0 cuentas) o de la **cuenta personal 1069788172741923**, que este token no ve. Confirmar cuál es y, si es de la empresa, darle acceso de solo lectura al token. Con el token no se pudo averiguar: `ads_posts` da error 403 de permiso en las 3 páginas (también con el token nuevo) y `promotion_status` no distingue lo promocionado (REDES.md, 7.2, consultas 10 y 11) | Marketing (Erick / Ismael) | 2026-11-24 | Pendiente |

## Ingeniero

| Pendiente | A quién se le pidió | Fecha | Estado |
|---|---|---|---|
| Confirmar la definición de «Lectura estimada» (aperturas de Brevo menos las automáticas de Apple MPP, campaña por campaña, sobre entregados; MAILING.md, sección 5) y los indicadores de Redes; meta de costo por mensaje y de costo por clic para el semáforo | Ingeniero | 2026-11-23 | Pendiente: la lectura estimada ya se muestra con esa regla |
| Redes · meta de **costo por mensaje** por moneda para la pauta (hoy US$ 1.50 y «cerca» hasta US$ 2.50, tomadas del mockup; sin meta en Q no hay color) | Ingeniero / Keily | 2026-11-24 | Pendiente |
| Redes · caso B: confirmar en la parte (1) que las publicaciones de Facebook traen `scheduled_publish_time` (sin eso, lo programado que ya salió no se puede reconocer y el caso B solo muestra pendientes vencidas y por venir) | Keily (con el token) | Parte (1) | Pendiente |
| Redes · fase 2 con datos de ejemplo: horarios (por hora), edad y sexo, segmentaciones (conjuntos de anuncios), plataforma y ubicación y formularios. Conectar solo si Meta los da sin complicar la fase 1 | Keily / Ismael | Después de la fase 1 | Hecho (24/11/2026): todo con datos reales, formularios solo el conteo (REDES.md, 7.4) |
| Redes · el cuadro marca → cuentas (server/redes/cuadroMarcas.js) se llena en la parte (1) con la lista que confirme Marketing | Keily / Marketing | Parte (1) | Hecho (24/11/2026): 3 páginas, 3 Instagram y la cuenta USD (REDES.md, 7.3) |
| Redes · **comentarios de Facebook**: el conteo de comentarios (y `reactions.summary`) pide el permiso `pages_read_user_content`. Hoy las interacciones de Facebook son reacciones + compartidos. Decidir si se agrega ese permiso (es de lectura) al token | Keily | 2026-11-24 | Pendiente |
| Redes · umbral del semáforo «¿Cumplimos lo programado?» (propuesta: 100 % verde, 90–99 % amarillo, menos de 90 % rojo; REDES.md, sección 4) y meta de costo por mensaje y por clic | Ingeniero | 2026-11-24 | Pendiente |

## Eduardo / TI

Borrador del mensaje para Eduardo (qué se sube, riesgos y qué debe aprobar): PRODUCCION.md, sección 4.

| Pendiente | A quién se le pidió | Fecha | Estado |
|---|---|---|---|
| **Aprobar la publicación de Mailing**: merge de `feature/marketing-v2` a `main`, correos visibles sin login (o `MKT_MOSTRAR_CORREOS = no`), rutas abiertas y quién cambia las claves expuestas | Eduardo | Antes del merge | Pendiente: borrador del mensaje listo (PRODUCCION.md, sección 4) |
| Crear usuario de solo lectura en la base de Cumplimiento de Clientes para el dashboard y cambiar la contraseña principal (estaba en un documento). Hoy el cruce usa `CC_DB_PASSWORD` con candados de solo lectura | Keily / Eduardo | — | Pendiente |
| Informar a Eduardo que los correos se muestran sin inicio de sesión (DECISIONES.md) | Keily → Eduardo | — | Pendiente |
| Confirmar si las rutas de totales de Mailing pueden quedar abiertas en producción hasta tener inicio de sesión real | Eduardo | Antes de publicar | Pendiente |
| ¿El estado «Sin confirmación» se quita del dashboard o se deja? (en la reunión dijo que no debería existir) | Eduardo | Por confirmar | Pendiente |
| ¿Para qué es el proyecto de Vercel `dashboard.centralizado`? (también arma versiones de prueba de este repo) | Eduardo | Por confirmar | Pendiente |
| En Vercel hay una `BREVO_API_KEY` **vieja** (Production y Preview) que Keily no puso; ningún código de `origin/main` la lee. Confirmar de quién es y si se puede borrar (y la llave en Brevo, si ya no se usa). Al publicar, Production debe quedar con la llave nueva | Keily / Eduardo | Antes de publicar | Pendiente |
| Valores reales en .env.example del historial del repo (SAP, Workflow, contraseñas maestras, webhooks de Make, llaves públicas de Supabase/Firebase), también en origin/main; llave tipo Google escrita directo en `src/config/env.ts`; contraseña escrita en `src/context/AuthContext.tsx` (usuario semilla) y contraseñas `VITE_MASTER_*`, que llegan al navegador. El login del portal acepta cualquier usuario y contraseña (no se verifica en el servidor): TI debe cambiarlos | Eduardo / TI | 2026-11-20 | Pendiente |
| Vaciar .env.example en main con un PR aparte y pequeño | Keily, con OK de Eduardo | — | Pendiente |

## Al publicar en producción

| Pendiente | Quién | Cuándo | Estado |
|---|---|---|---|
| Variables de Vercel **Production** (lista completa en PRODUCCION.md, sección 2) | Keily | Antes del merge | En curso: 6 puestas (23/11); faltan `CRON_SECRET` y `PROSPEKT_API_KEY` |
| Cambiar la dirección del webhook en Brevo a producción (sin bypass) y borrar el código de bypass de Vercel | Keily | Al publicar | Pendiente |
| Tarea diaria para que el proyecto Supabase Free no se pause | Keily | Al publicar | Código listo (cron en vercel.json, /api/marketing/mantener-supabase); falta `CRON_SECRET` y probarlo en producción (PRODUCCION.md, sección 3) |
| Quitar de Vercel las 4 variables viejas: `GOOGLE_SERVICE_ACCOUNT_JSON`, `MARKETING_DRIVE_FOLDER_ID`, `MARKETING_LOCAL_CSV_DIR` y `MARKETING_DETALLE_CLAVE` | Keily / TI | Al publicar | Pendiente |
| Conflicto vite/esbuild en instalación limpia: Vercel instala con **bun** (hay `bun.lock`), que lo tolera; con `npm` limpio falla (vite 8.3.8 pide esbuild 0.27/0.28 y el portal fija 0.25). `bun.lock` ya incluye `pg` | Keily / Eduardo | Antes de publicar | Pendiente |
| Renovar la llave de Brevo antes del 2027-11-20 | Keily | 2027-11-01 | Pendiente |
| **Aviso · token de Meta:** el acceso a datos vence cerca del **22/02/2027**. Renovarlo antes del **15/02/2027** (.env.local y Vercel Preview y Production) o cambiarlo por el token de usuario del sistema del ticket | Keily | 2027-02-15 | Pendiente |
