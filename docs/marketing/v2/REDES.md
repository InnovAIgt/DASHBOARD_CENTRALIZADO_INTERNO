# Pestaña Redes sociales

> **Plan v2 (24/11/2026), igual que Mailing:** por partes, un commit por parte, con fuentes, qué se puede y qué no.
> Reemplaza el plan del 23/11 en lo que ya no aplica. **Todavía no se escribe código de esta fase:** se espera el «sí»
> de Keily. Estado de los accesos: [PENDIENTES.md](PENDIENTES.md).
> Lo de la API de Meta se confirma en la parte (1): Meta cambia seguido los nombres y la disponibilidad de sus métricas
> (en 2025 retiró varias de páginas e Instagram y pasó de «impressions» a «views»).

## 1. Objetivo

**Lo que pidió el ingeniero (fase 1):** publicaciones **hechas** y **programadas**, en **Facebook** e **Instagram**, por
**marca** y por **país**:

| Marca | País |
|---|---|
| RED GT (RED Intelfon Guatemala) | GT |
| RED SV (RED Intelfon El Salvador) | SV |
| DATA RED | **SV** (confirmado el 23/11/2026) |

Con alcance, interacciones, seguidores y, para los anuncios pagados, gasto, clics y mensajes.

**Fase 2 (solo anotado, no se hace ahora):**
- **Leads** calificados / no calificados (sección 9).
- **Lo de Ismael:** edad, sexo, horarios, CTR, segmentaciones y presupuestos. Parte sale de los anuncios (desglose por
  edad y sexo, por hora, CTR, presupuesto); los públicos de las publicaciones normales tienen menos detalle. Se planea
  después de publicar la fase 1.

**Diseño:** mockup **v4** (`Descargas\datos-marketing\plantilla\mockup_redes_v4.html`, fuera del repo; solo se lee,
nunca se copia). **Pendiente:** el archivo no está en esa carpeta (24/11/2026); hasta tenerlo, la parte (3) no empieza.
Lo que se sabe del v4: barra de filtros, tarjetas, «Lo importante del mes» y 4 secciones, una de ellas «¿Cumplimos lo
programado?» (sección 4).

## 2. Fuentes y qué da cada una

### 2.1 API de Meta (solo lectura)

Una sola llave: el token de un **usuario del sistema** de solo lectura (sección 3). Cada consulta va firmada con
`appsecret_proof`. **Campos que se pedirán** (se confirman en la parte (1) contra la versión vigente; si un campo ya
no existe, se usa su reemplazo y se anota aquí):

| Qué | Consulta (Graph API) | Campos |
|---|---|---|
| Cuentas que ve el token | `GET /me/accounts`, `GET /{business-id}/owned_pages`, `GET /{business-id}/owned_ad_accounts` | `id`, `name`, `instagram_business_account{id,username}` (páginas); `id`, `name`, `currency`, `account_status`, `timezone_name` (cuentas publicitarias) |
| Seguidores Facebook | `GET /{page-id}` | `followers_count`, `fan_count` |
| Seguidores Instagram | `GET /{ig-user-id}` | `username`, `followers_count`, `media_count` |
| Publicaciones hechas · Facebook | `GET /{page-id}/published_posts?since=…&until=…` | `id`, `created_time`, `message` (solo el inicio, para el título), `permalink_url`, `status_type`, `attachments{media_type,type}`, `shares`. **Sin** `reactions.summary` ni `comments.summary`: piden `pages_read_user_content` (probado 24/11/2026); las reacciones salen de `post_reactions_by_type_total` |
| Métricas de cada publicación · Facebook | `GET /{post-id}/insights` | v25: alcance `post_total_media_view_unique` (reemplaza a `post_impressions_unique`), vistas `post_media_view` (reemplaza a `post_impressions`), clics `post_clicks`, reacciones `post_reactions_by_type_total` (**probadas en v25 con `read_insights`**, 7.2; período `lifetime`) |
| Publicaciones hechas · Instagram | `GET /{ig-user-id}/media` | `id`, `timestamp`, `caption` (inicio), `media_type`, `media_product_type` (feed, reel, historia), `permalink`, `like_count`, `comments_count` |
| Métricas de cada publicación · Instagram | `GET /{media-id}/insights` | `reach`, `views`, `total_interactions`, `saved`, `shares` (**`reach`, `views` y `total_interactions` probadas en v25**, 7.2) |
| Métricas de la cuenta · Instagram | `GET /{ig-user-id}/insights?period=day&metric_type=total_value&since=…&until=…` | `reach`, `views`, `total_interactions`, `accounts_engaged` (**probadas en v25**, 7.2). `impressions` ya no existe |
| Métricas de la página · Facebook | `GET /{page-id}/insights?period=day` | v25: `page_total_media_view_unique` (reemplaza a `page_impressions_unique`), `page_media_view` (reemplaza a `page_impressions`), `page_follows` (reemplaza a `page_fans`); `page_post_engagements` sigue vigente (**las 4 probadas en v25 con `read_insights`**, 7.2). `page_follows` es el total de seguidores de cada día: se usa el último valor, no la suma. La suma de `page_total_media_view_unique` por día no es el alcance único del período |
| Programadas · Facebook | `GET /{page-id}/scheduled_posts` | `id`, `message` (inicio), `scheduled_publish_time`, `created_time` |
| Anuncios: cuenta | `GET /act_{id}` | `name`, `currency`, `account_status`, `timezone_name` |
| Anuncios: campañas | `GET /act_{id}/campaigns` | `id`, `name`, `objective`, `status`, `effective_status`, `daily_budget`, `lifetime_budget`, `start_time`, `stop_time` |
| Anuncios: resultados | `GET /act_{id}/insights?level=campaign&time_range=…` | `campaign_id`, `campaign_name`, `spend`, `reach`, `impressions`, `clicks`, `inline_link_clicks`, `actions` (mensajes = `onsite_conversion.messaging_conversation_started_7d`) |

**Nunca se piden** datos personales de quienes comentan o escriben (nombres, perfiles, mensajes).

**Permisos del token (todos de lectura):** `pages_show_list`, `pages_read_engagement`, `read_insights` (en v25 llega al
agregar a la app el caso de uso «Administrar todos los aspectos de tu página»),
`instagram_basic`, `instagram_manage_insights`, `ads_read` y `business_management`. **Nunca** permisos de escritura
(`pages_manage_posts`, `ads_management`).

### 2.2 Programadas: qué existe en cada caso

| Fuente | Qué da | Estado |
|---|---|---|
| a) **Facebook** · `GET /{page-id}/scheduled_posts` | Publicaciones programadas de cada página (fecha y texto) | **A confirmar en la parte (1):** que responda con permisos de lectura y que incluya lo programado desde Meta Business Suite. Si Meta exigiera un permiso de escritura, **no se pide** y se trata como «sin programadas de Facebook» |
| b) **Instagram** | **La API no da programadas** | No existe |
| c) **«Plan del mes»** (carga manual, sección 8) | Lo que Marketing planea publicar: fecha, marca, red y título | **Solo si Marketing tiene un plan** (pregunta a Ismael en PENDIENTES). Si no lo tiene, no se hace |

### 2.3 Dinero y tasas

- **Moneda por cuenta publicitaria** (`currency` de Meta: `GTQ` → «Q», `USD` → «US$»). **Nunca se suman monedas
  distintas:** si un filtro junta varias, los totales de dinero se muestran por moneda. Los presupuestos de Meta vienen
  en centavos (se dividen entre 100 para Q y US$).
- **Las tasas se calculan en el dashboard desde los números crudos** (no se usan las tasas que da Meta), para poder
  sumar bien al filtrar:
  - **CTR** = clics ÷ impresiones × 100;
  - **CPC** = gasto ÷ clics (en la moneda de la cuenta);
  - **Costo por mensaje** = gasto ÷ mensajes;
  - **Tasa de interacción** = interacciones ÷ alcance × 100.
  - Si el divisor es 0 se muestra «—», como en Mailing.

### 2.4 Qué NO se puede sacar de Meta

Leads calificados o no calificados; programadas de Instagram; clics al enlace en publicaciones normales de Instagram;
presupuesto de publicaciones normales (solo los anuncios lo tienen); historias de Instagram después de 24 horas (solo
si se guardan ese día); y anuncios hechos **fuera** del Business Manager (agencia o cuenta personal: pendiente con
Marketing).

## 3. Acceso a Meta: qué hace cada quien

**Acceso al negocio «Negocio de Red Intelfon»:** **Erick** da acceso total a Keily (**Configuración del negocio →
Personas → Administradora**), o bien se usan los **códigos de la cuenta de Laura**. Debe confirmar que estén dentro del
negocio las 3 páginas, sus cuentas de Instagram y las cuentas publicitarias, y pasar la lista **marca → país → página
→ Instagram → cuenta publicitaria**.

**Keily** (con ese acceso):
1. **developers.facebook.com → Crear app**, tipo **«Empresa» (Business)**, conectada al negocio. Queda en modo
   desarrollo (solo lee cuentas del mismo negocio; no hace falta revisión de Meta).
2. **Configuración del negocio → Usuarios del sistema → Agregar** («Dashboard RED (solo lectura)», rol Empleado).
3. **Asignar activos solo para ver:** las 3 páginas («Ver contenido» y «Ver estadísticas»), las cuentas de Instagram y
   las cuentas publicitarias («Ver rendimiento»).
4. **Generar token** con caducidad «Nunca» y los permisos de la sección 2.1.
5. Variables en `.env.local` y en Vercel (Secret), **solo servidor, sin `VITE_`, nunca en el chat**:
   - `META_TOKEN`: token del usuario del sistema;
   - `META_APP_SECRET`: para firmar cada consulta (`appsecret_proof`);
   - `META_API_VERSION`: opcional, fija la versión de la API (por ejemplo, la que se probó en la parte (1)).

## 4. «¿Cumplimos lo programado?» según lo que exista

| Caso | Qué se compara | Cómo se ve |
|---|---|---|
| **A. Con «Plan del mes» cargado** | Plan de Marketing vs publicado (Meta), Facebook **e** Instagram | Por marca, red y semana: «publicadas X de Y» con **semáforo** (100 % verde, 90–99 % amarillo, menos de 90 % rojo; el amarillo se confirma con el ingeniero). Lo programado a futuro se cuenta aparte («por venir») |
| **B. Solo programadas de Facebook (API)** | Programadas de Facebook vs publicadas de Facebook | El mismo semáforo **solo para Facebook**; Instagram aparece con lo publicado y la nota «Instagram no da programadas» |
| **C. Sin programadas** | Nada que comparar | **Sin semáforo:** solo lo publicado por marca, red y semana, con la nota «No hay plan de publicaciones cargado: se muestra solo lo publicado» |

- El caso lo elige el dashboard solo: si hay plan del mes para ese mes → A; si no, si la API dio programadas de
  Facebook → B; si no → C. El caso usado se dice en la sección.
- Lo **programado que ya pasó** se cruza con lo publicado por marca, red y día (± 1 día); la regla exacta del cruce
  se documenta en la parte (4).

## 5. Rutas del servidor y errores

Rutas (solo lectura de Meta, con el token del servidor, nunca desde el navegador):
`/api/marketing/redes/cuentas`, `/api/marketing/redes/publicaciones`, `/api/marketing/redes/anuncios` y
`/api/marketing/redes/programadas` (`?mes=AAAA-MM`; marca, país y red se filtran en el navegador).

- **Caché:** 30 minutos en memoria y 10 en Vercel; pocas consultas, agrupadas (`?ids=` y `fields` anidados), para
  respetar los límites de Meta. Cuadro marca → país → cuentas en un archivo del repo, sin llaves.
- **Errores** (mensaje claro en pantalla, sin mostrar el token ni el texto crudo de Meta):

| Error de Meta | Qué se muestra |
|---|---|
| Token vencido o inválido (código 190) | «El acceso a Meta venció: hay que generar un token nuevo» |
| Permiso faltante (códigos 10, 200 y similares) | «Falta el permiso <nombre> en el token» |
| Límite de llamadas (códigos 4, 17, 32, 613, 80001, 80004) | Se usan los últimos datos guardados en caché, con la hora, y se reintenta más tarde |
| Una cuenta falla | Las demás siguen; aviso con el nombre de la cuenta |
| Sin `META_TOKEN` | Se usan los **datos de ejemplo** (misma forma), con el aviso «Datos de ejemplo» |

- Forma de las respuestas: la misma de `datos/redesEjemplo.js` (cuentas, publicaciones con estado, anuncios con
  `moneda`), más `programadas` y `fuente` (`meta` / `ejemplo`).

## 6. Pantalla

- Igual al **mockup v4** (cuando esté): barra de filtros (País, Marca, Red, Mes, PDF, ↺ y «Filtrado por»), tarjetas,
  «Lo importante del mes» y las 4 secciones, con el estilo de Mailing (tema negro, globos con el valor exacto,
  animaciones que respetan «reducir movimiento»).
- En **Production** la pestaña sigue en «Próximamente» hasta la parte (6) (`MKT_REDES_VISIBLE`, PRODUCCION.md).
- **Ya hecho con datos de ejemplo (23/11/2026, diseño v3):** datos de ejemplo y cálculos (`datos/redes.js`,
  `datos/redesEjemplo.js`, `datos/useRedesDatos.js`), barra de filtros, sub-pestañas y el Resumen. En la parte (3) se
  ajusta al v4 y se reutiliza lo que sirva.

## 7. Partes (un commit por parte)

| Parte | Qué | ¿Necesita el token? |
|---|---|---|
| **(1) Conexión** | Listar las páginas, cuentas de Instagram y cuentas publicitarias que ve el token (nombre e id, sin datos personales) y confirmar las 3 marcas. **Antes de llamar a Meta se muestran las consultas exactas y se espera el «sí» de Keily.** Después, solo conteos y qué métricas existen (incluye probar `scheduled_posts`) | **Sí** |
| **(2) Rutas del servidor** | Las 4 rutas de la sección 5, con caché, errores y pruebas con respuestas inventadas de Meta | Se programa y prueba sin token; se confirma con token |
| **(3) Pantalla** | Datos reales igual al mockup v4: filtros, tarjetas, «Lo importante del mes» y las 4 secciones. Sin token, con datos de ejemplo de la misma forma | No (necesita el **mockup v4**) |
| **(4) Programadas** | Casos A, B y C de la sección 4: programadas de Facebook por la API y, **solo si Marketing tiene plan**, la carga manual «Plan del mes» | La parte de Facebook, sí; la carga manual, no (espera la respuesta de Ismael) |
| **(5) PDF** | Con la misma herramienta de Mailing (`dashboard-pdf.js`), respetando los filtros y la moneda por separado | No |
| **(6) Publicar** | Pruebas, push, PR (merge commit), `MKT_REDES_VISIBLE = si` en Production y checklist en PRODUCCION.md | Sí (para probar con datos reales) |

### 7.1 Resultado de la parte (1) · 24/11/2026

Token: **de usuario** (app «Automatizacion RRSS RED»), caducidad «Nunca», pero el **acceso a datos vence cerca del
22/02/2027** (renovar antes del 15/02/2027 o cambiar por el token de usuario del sistema; PENDIENTES). API **v25.0**.
Siete consultas GET firmadas con `appsecret_proof`; las de página, con el page token que da `/me/accounts`.

**Permisos concedidos:** `pages_show_list`, `pages_read_engagement`, `instagram_basic`,
`instagram_manage_insights`, `ads_read`, `business_management` (y `public_profile`). `ads_management`
aparece **rechazado** (bien: no se quiere escritura). `read_insights` no está disponible en el explorador con v25.

**Lo que ve el token** (ids públicos de Meta, sin llaves):

| Marca | Página de Facebook (id) | Instagram (id) |
|---|---|---|
| DATA RED (SV) | DATA RED · 1380958005335649 | @datared.sv · 17841471744067980 |
| RED SV | Red Intelfon El Salvador · 158499677543511 | @red_intelfonsv · 17841452455981746 |
| RED GT | Red Intelfon Guatemala · 254248524588808 | @redguatemala · 17841433874056396 |

- **Están las 3 marcas**, cada una con su página y su Instagram. Las 3 páginas dieron page token.
- **Negocios:** «Negocio de Red Intelfon» (316396702299495) y «RED Intelfon Guatemala» (1180080569316160).
- **Cuentas publicitarias:**
  - `act_2035747430056013` · **USD** · activa · del «Negocio de Red Intelfon» (su nombre es el mismo número).
  - `act_1657231285337963` · **GTQ** · activa · asignada directo al usuario, no a un negocio; su nombre es el de
    una persona. **Falta confirmar con Marketing** si es la pauta de RED GT y a qué marca va cada cuenta.
  - El negocio «RED Intelfon Guatemala» no devolvió cuentas propias.
  - **Decisión de Keily (24/11/2026):** por ahora el dashboard usa **solo `act_2035747430056013`** (USD, «Negocio de
    Red Intelfon»). La `act_1657231285337963` (GTQ) queda **fuera** hasta que Marketing confirme si es de la empresa.
- **Programadas de Facebook (`scheduled_posts`):** **se pueden leer** con estos permisos y el page token, en las 3
  páginas. Hoy hay **0** programadas en cada una; falta confirmar que aparezca algo programado desde Meta Business
  Suite (prueba con una publicación programada).
- **Estadísticas de página (`/{page-id}/insights`):** con `metric=page_impressions_unique,page_post_engagements`,
  `period=day`, `date_preset=last_7d` y el page token de RED GT, Meta respondió **sin error pero con 0 métricas**.
  Probablemente esas métricas ya no existen en v25 (Meta retiró varias métricas de página); hay que probar sus
  reemplazos antes de la parte (2) (PENDIENTES).

### 7.2 Cuentas publicitarias y estadísticas · 24/11/2026

Consultas GET firmadas con `appsecret_proof` (solo nombres, ids, conteos y montos).

**Cuentas publicitarias:**

| Cuenta | Dueño | Moneda · zona | Gasto total | Gasto 90 días | Campañas | Páginas que promociona (anuncios · gasto 90 días) |
|---|---|---|---|---|---|---|
| `act_2035747430056013` | Negocio «Negocio de Red Intelfon» | USD · America/El_Salvador | US$ 1,697.67 | US$ 666.55 | 78 | **Red Intelfon El Salvador** (81 · US$ 657.21) y **DATA RED** (2 · US$ 0) |
| `act_1657231285337963` | **Personal**, sin negocio | GTQ · America/Guatemala | Q 0 | Q 0 | 0 | Ninguna |

- La cuenta USD **no tiene anuncios de RED GT**. De los US$ 666.55 de 90 días, US$ 9.34 son de anuncios que ya no
  aparecen en la lista (borrados o archivados), sin página identificada.
- Entre las campañas recientes de la cuenta USD hay **campañas de reclutamiento** (vacantes, plazas de trabajo,
  «Nueva vacante RH»), además de las comerciales.
- La cuenta GTQ es **personal, sin anuncios de RED**: queda fuera.
- Negocio «RED Intelfon Guatemala» (1180080569316160): **0** cuentas propias, **0** de cliente y **0** páginas; el
  token no dio error de permiso. El «Negocio de Red Intelfon» tampoco tiene cuentas de cliente. Con lo que ve el
  token, **RED GT no tiene pauta**.

**Aprobado por Keily (24/11/2026):** incluir solo `act_2035747430056013` y repartir su gasto **por la página del
anuncio**, no por la cuenta: lo de «Red Intelfon El Salvador» a **RED SV** y lo de «DATA RED» a **DATA RED**. RED GT
se muestra «sin pauta en las cuentas que ve el token». El gasto sin página se muestra aparte («sin página»).
La cuenta GTQ queda fuera.

**Reclutamiento aparte (decisión de Keily, 24/11/2026; DECISIONES.md):** una campaña es de **«Reclutamiento»** si
su nombre contiene alguna de estas palabras (sin importar mayúsculas ni tildes; «RH» como palabra suelta):
`vacante`, `plaza`, `empleo`, `RH`, `reclutamiento`, `trabajo` (también en plural), `contratación`,
`contratando`, y las **frases completas** «ejecutivo de ventas» y «únete» (como palabra suelta, para no marcar
campañas comerciales). La lista vive en **un solo
lugar del código**, fácil de editar. Esas campañas **no cuentan** en inversión, mensajes ni costo por mensaje de
marketing; se muestran **aparte, con su gasto**. Con la lista actual, de las 10 campañas recientes caen en
Reclutamiento: «Nueva vacante RH», «2026 NOVIEMBRE 13 - MARKETING PLAZA», «2026 NOVIEMBRE 6 VACANTES» y «2026 -
NOVIEMBRE - 3 PLAZAS DE TRABAJO», y con «ejecutivo de ventas» (agregada el 24/11/2026) también «2026 NOVIEMBRE 11
EJECUTIVO DE VENTAS».

**Estadísticas (v25, RED GT, page token):**

| Qué | Métricas | Resultado |
|---|---|---|
| Página de Facebook (últimos 7 días) | `page_total_media_view_unique`, `page_media_view`, `page_post_engagements`, `page_follows` | **Sin error, pero vacías** (0 métricas) |
| Seguidores de la página | `followers_count`, `fan_count` | Responden |
| Publicación de Facebook | `post_total_media_view_unique`, `post_media_view`, `post_clicks`, `post_reactions_by_type_total` | **Sin error, pero vacías** (la publicación probada era del mismo día) |
| Publicación de Instagram | `reach`, `views`, `total_interactions` | **Responden** |
| Cuenta de Instagram (7 días, `total_value`) | `reach`, `views`, `total_interactions`, `accounts_engaged` | **Responden** |
| Seguidores de Instagram | `followers_count`, `media_count` | Responden |

- Que Meta acepte los nombres sin error y devuelva vacío indica que las métricas existen pero **el token no puede
  leer las estadísticas de Facebook**.

**Consulta 9 (24/11/2026):**
- Tareas del usuario en las 3 páginas: `CREATE_CONTENT`, `MODERATE`, `MESSAGING`, `ADVERTISE`, **`ANALYZE`**,
  `MANAGE_LEADS`, `VIEW_MONETIZATION_INSIGHTS`. **Sí tiene «Ver estadísticas»**: no es la causa.
- RED SV y DATA RED, rango de hace 10 a hace 3 días: las 4 métricas de página responden **vacías**. Con una
  publicación de hace más de 3 días (RED SV, 14/11; DATA RED, 20/10), las 4 de publicación también **vacías**. **No es
  demora de Meta.**
- Conclusión: es del **token o de la app**, no de las páginas. Lo más probable es que falte el permiso
  `read_insights`, que la app no ofrece en el explorador (Meta lo da al agregar a la app el caso de uso de páginas
  con estadísticas), o que el token de usuario del sistema del ticket sí lo traiga. Hasta resolverlo, Facebook se
  muestra con seguidores y lo que dan `published_posts` (reacciones, comentarios, compartidos), sin alcance ni vistas
  (PENDIENTES).

**Token nuevo con `read_insights` (24/11/2026):** Keily agregó a la app el caso de uso «Administrar todos los
aspectos de tu página» y generó un token nuevo (reemplaza al anterior) con 7 permisos; `/me/permissions` confirma
`read_insights` **concedido** (`ads_management` sigue rechazado). Con él, **las estadísticas de Facebook ya
responden** en las 3 páginas (días: hace 10 a hace 1; publicación de hace más de 3 días):

| Página | Alcance (`page_total_media_view_unique`, suma diaria) | Vistas (`page_media_view`) | Interacciones (`page_post_engagements`) | Seguidores (`page_follows`, último día aprox.) | Publicación: alcance · vistas · clics · reacciones |
|---|---|---|---|---|---|
| DATA RED | 12 | 77 | 0 | ~104 | 11 · 35 · 2 · 0 |
| RED SV | 10,461 | 16,386 | 331 | ~2,475 | 80 · 187 · 2 · 0 |
| RED GT | 13,083 | 18,524 | 416 | ~2,431 | 64 · 95 · 1 · 0 |

- Las métricas de página traen 9 valores diarios; las de publicación, `lifetime` (y `post_total_media_view_unique`
  también 2 valores `day`).
- **Causa de lo vacío:** faltaba `read_insights` (no era la tarea ANALYZE ni demora de Meta).
- `page_follows` es el total de cada día; el dashboard usa el último valor. Sumar el alcance diario cuenta varias
  veces a la misma persona: para el mes se usará el período que dé Meta o se dirá «suma de alcance diario».

**Consulta 10 (24/11/2026) · ¿RED GT pauta desde otra cuenta?**
- `GET /{page-id}/ads_posts` con el page token de RED GT, RED SV y DATA RED: las 3 responden **error 403, código
  200, «Not enough permission to call this endpoint»**. Ese endpoint pide un permiso de anuncios de página que el
  token no tiene (y que no se pide, porque sería más que lectura). **No se pudo concluir** si RED GT pauta desde otra
  cuenta.
- La cuenta USD tiene 83 anuncios que usan 74 publicaciones distintas (dato para el cruce, si se consigue otra vía).
- **Repetida con el token nuevo (con `read_insights`):** `ads_posts` sigue dando **403, código 200** en las 3 páginas.

**Consulta 11 (24/11/2026) · `promotion_status` de las últimas 20 publicaciones:**

| Página | Fechas | Estados | En anuncios de la cuenta USD |
|---|---|---|---|
| RED GT | 09/10 a 24/11/2026 | `inactive` 20 | 0 |
| RED SV | 10/10 a 24/11/2026 | `inactive` 20 | 3 |
| DATA RED | 13/07 a 20/10/2026 | `inactive` 19, `ineligible` 1 | 0 |

- Las 3 publicaciones de RED SV que **sí** están en anuncios de la cuenta USD también dicen `inactive`: el campo no
  distingue «se promocionó» de «nunca se promocionó» (`inactive` = se puede promocionar y hoy no tiene promoción
  activa). **No sirve para saber si hubo pauta.**
- **Conclusión:** con lo que permite el token **no se puede confirmar** si RED GT pauta desde otra cuenta. Lo seguro:
  ninguna de las últimas 20 publicaciones de RED GT se usó en anuncios de la cuenta USD y ningún anuncio de esa
  cuenta es de RED GT. Hoy **ninguna** de las 3 páginas tiene una promoción activa sobre esas publicaciones. Queda la
  pregunta a Marketing (PENDIENTES).

### 7.3 Tarea 2 · Pantalla conectada a Meta · 24/11/2026

Cuatro commits en `feature/marketing-v2` (sin push): servidor con cuentas y métricas v25; anuncios por página y
reclutamiento; pantalla; documentos.

**Servidor** (`server/redes/`):
- `cuadroMarcas.js` lleno: 3 páginas, 3 Instagram y solo `act_2035747430056013` (USD). API **v25.0**.
- `/cuentas`: seguidores y métricas del mes y del anterior. Facebook (con el token de cada página):
  `page_total_media_view_unique` (suma diaria), `page_media_view`, `page_post_engagements`, `page_follows` (último
  valor = seguidores). Instagram: `reach` diario (time_series, suma diaria), `views`, `total_interactions` y
  `accounts_engaged` (total_value, en tramos de hasta 30 días), `followers_count`. Nunca pide fechas futuras.
- `/publicaciones`: Facebook con `post_total_media_view_unique` (alcance, período lifetime), `post_media_view`,
  `post_clicks`, `post_reactions_by_type_total`; interacciones de Facebook = reacciones + compartidos (los
  comentarios piden `pages_read_user_content`). Instagram con `reach`, `views`, `total_interactions`.
- `/programadas`: `scheduled_posts` de cada página (hoy 0).
- `/anuncios`: resultados **por anuncio** (`level=ad`) sumados por campaña, marca y mes según la página de la
  creatividad; «sin página» si no es de RED. Incluye anuncios archivados (`DELETED` no se puede pedir: error 100).
  Cada fila dice si es de **reclutamiento** (`server/redes/reclutamiento.js`, lista editable).
- **Fechas:** Meta da UTC; el servidor pasa todo a **UTC−6** antes de agrupar por día, semana y mes (también la hora
  de cada publicación). Las métricas diarias de página las calcula Meta por su propio día.
- **Caché** de 30 min por recurso y mes; si Meta falla y hay copia, se devuelve con aviso. Errores claros: token
  vencido, falta de permiso, límite de llamadas. Si una cuenta falla, las demás siguen.
- **Secretos:** el token, la clave, el `appsecret_proof` y las URLs firmadas nunca salen en logs, errores ni en la
  respuesta al navegador (prueba automática que lo revisa).

**Pantalla** (`src/modulos/marketing/marketing-v2/`):
- **Siempre Meta.** Sin token, sin servidor o con error de Meta: aviso con «Reintentar». Los datos de ejemplo
  (`datos/redesEjemplo.js`) quedan **solo para pruebas**.
- **Resumen:** tabla **«Publicaciones hechas y programadas · por país y marca»** (Guatemala: RED GT; El Salvador: RED SV
  y DATA RED, con total del país). Facebook: hechas y programadas (pendientes); Instagram: hechas y, en lugar de un 0,
  **«Instagram no permite ver programadas»**. Tarjeta **Alcance = suma de alcance diario** de las cuentas, con nota
  (una persona puede contarse más de una vez); compara con el mes anterior solo si el mes ya cerró. Inversión,
  mensajes y costo por mensaje **sin reclutamiento**; el reclutamiento sale aparte con su gasto. RED GT: «sin pauta en
  las cuentas que ve el token».
- **Publicaciones:** columnas Vistas y Clics; calendario y «Mejor día» en hora de Guatemala/El Salvador.
- **Anuncios:** reclutamiento fuera de los indicadores, con nota aparte; columna Marca «Sin página» cuando aplica.
- **PDF:** igual que la pantalla (tabla por país y marca, alcance como suma diaria, reclutamiento aparte).

**Prueba con datos reales (noviembre 2026, hasta el 24):** RED GT 6 hechas en Facebook y 5 en Instagram; RED SV 7 y 7;
DATA RED 0 y 0; 0 programadas en Facebook. Alcance (suma diaria de las 6 cuentas) 118,940. Inversión de marketing
US$ 142.84 con 93 mensajes; reclutamiento aparte US$ 77.25.

### 7.4 Anuncios fase 2 con datos reales · 24/11/2026

Pedido de Ismael. Solo lectura (GET), solo `act_2035747430056013` (USD), **sin reclutamiento**. Ruta nueva
`GET /api/marketing/redes/anuncios-detalle?mes=AAAA-MM` (`server/redes/detalleAnuncios.js`), con caché de 30 min
y los mismos errores que las demás. Todas las consultas son `/act_…/insights` con `level=ad` (para saber la marca
por la página de cada anuncio) y el rango del **mes elegido en el filtro**, sin pasar de hoy:

| Recuadro | Consulta | Notas |
|---|---|---|
| Edad y sexo | `breakdowns=age,gender` | Mensajes de hombres y mujeres por edad; costo por mensaje |
| Plataforma y ubicación | `breakdowns=publisher_platform,platform_position` | Facebook, Instagram, WhatsApp, Audience Network |
| Horarios | `breakdowns=hourly_stats_aggregated_by_advertiser_time_zone`, `time_increment=1` | Día de la semana × franja de 2 h. **Zona de la cuenta: America/El_Salvador (UTC−6)**, la misma del dashboard |
| Segmentaciones | insights por anuncio + `/act_…/adsets` (`targeting`) | Público del conjunto: edad, sexo (ninguno lo fija: «Ambos»), ubicaciones («Automáticas» si no se eligen), países e intereses (nombres de categorías, no personas) |
| Presupuestos | `/act_…/campaigns` y `/act_…/adsets` | Presupuesto de la campaña o, si está en los conjuntos, la suma de ellos (÷ 100) |
| Formularios | acciones `lead` / `onsite_conversion.lead_grouped` de los insights | **Solo el conteo** (se toma el mayor de los dos: son el mismo envío). No se usa `leads_retrieval` ni se lee el contenido. Si es 0, Conversiones muestra solo mensajes |

- **«Pocos datos»** (regla de Keily): un grupo con **menos de 5 mensajes** lo dice y **nunca** sale como el mejor
  (horario, edad, ubicación, segmentación, presupuesto).
- Ya no queda nada de ejemplo en Anuncios: se quitaron todas las etiquetas «Ejemplo».
- Si el detalle falla, solo esos recuadros muestran el aviso con «Reintentar»; el resto de Anuncios sigue.

**Prueba con datos reales:**

| Mes | Mensajes | Edad×sexo (5+) | Ubicaciones (5+) | Segmentos (5+) | Presupuestos | Formularios | Mejor horario |
|---|---|---|---|---|---|---|---|
| Noviembre 2026 (hasta el 24) | 97 | 15 (5) | 15 (2) | 5 (2) | 5 | 4 | martes 20:00–22:00 |
| Octubre 2026 | 170 | 18 (8) | 15 (6) | 11 (7) | 10 | 5 | domingo 16:00–18:00 |

## 8. «Plan del mes» (solo si Marketing tiene un plan)

- Pantallita donde **Marketing carga lo programado** del mes: **fecha, marca, red y título** de cada publicación.
- Se guarda con la **clave de Marketing** (`MKT_CLAVE_EDICION`, como «Cargo y objetivo»): la valida el servidor y queda
  «por <nombre> · <fecha>».
- Tabla nueva en «Dashboard Canales de marketing» (SQL que corre Keily). Sirve también para Instagram.
- **Si Marketing no tiene plan, no se hace** y la sección queda en el caso B o C. Se pregunta a Ismael si lo tienen y
  en qué formato (si ya está en un Excel o calendario, se puede cargar igual sin cambiar su forma de trabajo).

## 9. Leads (fase 2)

- Un lead es **calificado** si el bot de WhatsApp le da **75 puntos o más**, y **no calificado** si le da menos. Después
  pasa a un **CRM**; los calificados alimentan el embudo de **Flujo de ventas**.
- Para unir un lead con su publicación hacen falta **códigos por publicación** (Ismael + equipo Prospekt IA) y el
  acceso a **G24** y al CRM o bot. Prospekt guarda el origen (p. ej. «PostIAlo Redes Sociales») pero no la publicación.

## 10. Reglas

- Meta **solo lectura**; nunca se muestran ni se escriben valores de tokens o claves (solo los nombres de las
  variables).
- Si falta el token, se avanza con **datos de ejemplo** con la misma forma, con el aviso visible.
- **No se toca Mailing** ni otros dashboards.
- **Supabase** solo si hace falta guardar algo que Meta no da o que se pierde (Plan del mes; más adelante fotos
  diarias para historias de Instagram). Primera fase sin Supabase, salvo el Plan del mes.
