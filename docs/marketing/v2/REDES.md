# Pestaña Redes sociales

> Plan aprobado por Keily el 23/11/2026 (por partes, un commit por parte). **Todavía no se escribe código:** la
> parte (1) empieza cuando Keily tenga el token de Meta. Estado de los accesos: [PENDIENTES.md](PENDIENTES.md).
> Lo de la API de Meta se confirma en la prueba de solo lectura de la parte (1): Meta cambia seguido los nombres y la
> disponibilidad de sus métricas (en 2025 retiró varias de páginas e Instagram).

## 1. Qué pidió el ingeniero

- Publicaciones **hechas** y **programadas**, por **marca** y **país**, en **Facebook** e **Instagram**.
  Cuentas: **DATA RED**, **RED Intelfon Guatemala** y **RED Intelfon El Salvador**.
- Por publicación o campaña: **presupuesto**, **alcance**, **visualizaciones**, **clics**, **costo por clic**,
  **mensajes** y **costo por mensaje**.
- **Leads calificados / no calificados** (pendiente: códigos por publicación + G24).
- Todo **directo de la API de Meta**, sin Excel.

## 2. Acceso a Meta: qué hace cada quien

**Erick** (administrador del Business Manager):
1. Agrega a Keily en **business.facebook.com → Configuración del negocio → Personas** como **Administradora**.
2. Confirma que estén dentro del negocio las 3 páginas de Facebook, sus cuentas de Instagram y las cuentas
   publicitarias.
3. Pasa la lista **marca → país → página de Facebook → cuenta de Instagram → cuenta publicitaria** (¿DATA RED es de
   un país o de los dos?), si hay anuncios pagados **fuera** de ese Business Manager (agencia o cuenta personal) y
   quién programa las publicaciones y desde dónde.

**Keily**:
4. **developers.facebook.com → Crear app**, tipo **«Empresa» (Business)**, conectada al Business Manager de RED. Se
   queda en modo desarrollo (solo lee cuentas del mismo negocio; no hace falta revisión de Meta).
5. **Configuración del negocio → Usuarios del sistema → Agregar** («Dashboard RED (solo lectura)», rol Empleado).
6. **Asignar activos solo para ver**: las 3 páginas («Ver contenido» y «Ver estadísticas»), las cuentas de Instagram
   y las cuentas publicitarias («Ver rendimiento»).
7. **Generar token** con caducidad «Nunca» y estos permisos, todos de lectura: `pages_show_list`,
   `pages_read_engagement`, `read_insights`, `instagram_basic`, `instagram_manage_insights`, `ads_read` y
   `business_management`. **Nunca** permisos de escritura (`pages_manage_posts`, `ads_management`).
8. Pone las variables en `.env.local` y en Vercel (Secret). **Nunca se pegan en el chat.** Solo servidor, sin `VITE_`:
   - `META_TOKEN`: token del usuario del sistema;
   - `META_APP_SECRET`: para firmar cada consulta (`appsecret_proof`);
   - `META_API_VERSION`: opcional, para fijar la versión de la API.

## 3. Qué da la API y qué NO

| Pedido | Publicaciones normales (páginas e Instagram) | Anuncios pagados (Administrador de anuncios) |
|---|---|---|
| Publicaciones hechas | Sí, Facebook e Instagram | Sí, anuncios y publicaciones promocionadas |
| Publicaciones programadas | Facebook: probablemente sí (se confirma). **Instagram: no** | Sí, campañas con inicio futuro |
| Presupuesto | No tienen | Sí (diario o total) y el gasto real |
| Alcance | Sí | Sí |
| Visualizaciones | Sí, con el nombre vigente («views»; antes «impressions») | Sí (impresiones y reproducciones de video) |
| Clics | Facebook sí; Instagram solo interacciones (no clics al enlace) | Sí (clics y clics en el enlace) |
| Costo por clic | — | Sí |
| Mensajes | No | Sí: «conversaciones iniciadas» (anuncios a WhatsApp o Messenger) |
| Costo por mensaje | — | Sí |
| Por Facebook / Instagram | Sí | Sí |
| Por marca y país | Sí (cada página es de una marca y un país) | Sí (por cuenta o campaña; también por país del público) |
| Leads calificados / no calificados | **No** | **No** (Meta solo sabe que alguien escribió) |

**No se puede sacar de Meta:** leads calificados o no calificados; programadas de Instagram; clics al enlace en
publicaciones normales de Instagram; presupuesto de publicaciones normales; y los datos de las **historias de
Instagram** después de 24 horas (solo si se guardan ese día).

## 4. Cómo se guarda y se actualiza

- Rutas del servidor (solo lectura de Meta, con el token del servidor):
  `/api/marketing/redes/cuentas`, `/api/marketing/redes/publicaciones` y `/api/marketing/redes/anuncios`.
- Caché de 30 minutos en memoria y 10 en Vercel; pocas consultas (agrupadas) respetando los límites de Meta.
- Cuadro marca → país → cuentas en un archivo de configuración del repo (sin llaves), para que lo revise Ismael.
- **Supabase** (proyecto «Dashboard Canales de marketing») solo para lo que se pierde o se repite: foto diaria de
  métricas (historias de Instagram, no pedir todo el historial cada vez) y más adelante los códigos por publicación.
  Sería un SQL 005 que Keily corre; necesita la tarea diaria de Vercel (PENDIENTES). **Primera fase sin Supabase.**

## 5. Pantalla (mismo estilo que Mailing)

- **Barra de filtros** como la de Facturación: Marca (DATA RED · RED GT · RED SV), País (Todos · GT · SV), Red
  (Facebook · Instagram), Período, «Filtros ▾» (Tipo orgánica/pagada, Estado publicada/programada, Campaña), PDF y ↺;
  debajo, «Filtrado por».
- **Sub-pestañas:**
  1. **Resumen**: tarjetas compactas (Publicaciones · Alcance · Visualizaciones · Clics · Gasto · Mensajes) y fila
     bajita (CPC · Costo por mensaje · Interacciones · Programadas); gráficas de alcance y gasto por día, dona Facebook
     vs Instagram y barras por marca y país.
  2. **Publicaciones**: tarjetas con lugar 1-2-3 por la métrica elegida (título = inicio del texto; debajo «marca · red
     · fecha») y acordeón con vista previa, métricas y enlace.
  3. **Anuncios**: campañas como «Por campaña» y tabla con presupuesto, gasto, alcance, clics, CPC, mensajes y costo
     por mensaje (semáforo con la meta que defina el ingeniero).
  4. **Programadas**: calendario por día (con la nota «Instagram no muestra programadas»).
  5. **Leads**: «Próximamente», con lo que falta.
- Tema negro, globos con el valor exacto y animaciones que respetan «reducir movimiento». Siempre datos reales.

## 6. Leads

- Un lead es **calificado** si el bot de WhatsApp le da **75 puntos o más**, y **no calificado** si le da menos.
  Después pasa a un **CRM**; los calificados alimentan el embudo de **Flujo de ventas**.
- Para unir un lead con su publicación hacen falta **códigos por publicación** (Ismael + equipo Prospekt IA) y el
  acceso a **G24** y al CRM o bot. Prospekt guarda el origen (p. ej. «PostIAlo Redes Sociales») pero no la publicación.

## 7. Partes del trabajo

1. **Prueba de solo lectura** con el token: antes se muestran las consultas exactas; luego solo conteos y qué
   métricas existen. *(Espera el token de Meta.)*
2. Rutas del servidor y cuadro de marcas.
3. Resumen.
4. Publicaciones y Programadas.
5. Anuncios.
6. Documentación con cada fórmula (como en [MAILING.md](MAILING.md)).
7. **Plan del mes** *(para después; solo planeado)*:
   - Pantallita donde **Marketing carga lo programado** del mes: **fecha, marca, red y título** de cada publicación.
   - Se guarda con la **misma clave de Marketing** (`MKT_CLAVE_EDICION`, como «Cargo y objetivo»): la valida el
     servidor y queda «por <nombre> · <fecha>».
   - Compara **programado vs publicado** (lo publicado sale de Meta) por marca, red y semana o mes, con **semáforo**:
     publicaron todo lo programado = verde; si programaron 14 y publicaron 10 = **rojo** (umbral del amarillo por
     definir con el ingeniero).
   - Se guardaría en una tabla nueva de «Dashboard Canales de marketing» (SQL que Keily corre). Sirve también para
     Instagram, cuyas programadas no da la API.

Supabase (fotos diarias) y los leads van después de las partes 1 a 6.
