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
| Publicaciones hechas · Facebook | `GET /{page-id}/published_posts?since=…&until=…` | `id`, `created_time`, `message` (solo el inicio, para el título), `permalink_url`, `status_type`, `attachments{media_type,type}`, `reactions.summary(total_count)`, `comments.summary(total_count)`, `shares` |
| Métricas de cada publicación · Facebook | `GET /{post-id}/insights` | alcance (`post_impressions_unique` o su reemplazo), visualizaciones (`views`), clics (`post_clicks`) |
| Publicaciones hechas · Instagram | `GET /{ig-user-id}/media` | `id`, `timestamp`, `caption` (inicio), `media_type`, `media_product_type` (feed, reel, historia), `permalink`, `like_count`, `comments_count` |
| Métricas de cada publicación · Instagram | `GET /{media-id}/insights` | `reach`, `views`, `total_interactions`, `saved`, `shares` |
| Programadas · Facebook | `GET /{page-id}/scheduled_posts` | `id`, `message` (inicio), `scheduled_publish_time`, `created_time` |
| Anuncios: cuenta | `GET /act_{id}` | `name`, `currency`, `account_status`, `timezone_name` |
| Anuncios: campañas | `GET /act_{id}/campaigns` | `id`, `name`, `objective`, `status`, `effective_status`, `daily_budget`, `lifetime_budget`, `start_time`, `stop_time` |
| Anuncios: resultados | `GET /act_{id}/insights?level=campaign&time_range=…` | `campaign_id`, `campaign_name`, `spend`, `reach`, `impressions`, `clicks`, `inline_link_clicks`, `actions` (mensajes = `onsite_conversion.messaging_conversation_started_7d`) |

**Nunca se piden** datos personales de quienes comentan o escriben (nombres, perfiles, mensajes).

**Permisos del token (todos de lectura):** `pages_show_list`, `pages_read_engagement`, `read_insights`,
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
