# Paso a producción · Canales de marketing (Mailing)

Guía para publicar la rama `feature/marketing-v2` en Vercel Production. Solo nombres de variables: los valores nunca
van en el repo ni en la conversación. Preparado el 2026-11-23; **todavía sin push, PR ni merge**.

## 1. Qué se publica

- **Mailing completo** (MAILING.md): campañas de Brevo (solo lectura), detalle por correo (historial importado +
  webhook), cruce con Cumplimiento de Clientes (solo lectura), Comparar, Correos por corregir con aviso al ejecutivo,
  Relación con clientes, Cargo y objetivo (guarda con clave de Marketing), PDF.
- **Redes sociales:** en Production muestra **«Próximamente»**; en Preview y en local, la pantalla con datos de ejemplo.
  Se decide al armar la página con `VERCEL_ENV` (`datos/bandera.js`); `MKT_REDES_VISIBLE` = `si` / `no` la fuerza. En
  Production los datos de ejemplo ni siquiera entran en la página.
- **Funciones de Vercel (plan Hobby, máximo 12):** todas las rutas de Mailing, Redes, el webhook y la tarea diaria van
  en UNA función, `api/marketing/canales.js` (rewrite en `vercel.json`; las URLs no cambian). Hoy hay 7 funciones en total.
- **Webhook de Brevo:** `POST /api/marketing/brevo-webhook`.
- **Tarea diaria** para que Supabase Free no se pause: cron de Vercel (`vercel.json`), `GET
  /api/marketing/mantener-supabase` a las 12:00 UTC (6:00 Guatemala), solo en Production, con `CRON_SECRET`.
- **Fuera de Marketing:** `PortalLayout.tsx` (en Canales de marketing el menú se esconde, se asoma con el mouse y corre
  el dashboard), `vite.config.ts` (bandera de Redes), `vercel.json` (funciones de Mailing y el cron), `server.ts`
  (rutas locales). Se borró el Mailing y el Redes viejos (Google Drive / Excel), incluido un Excel con datos que estaba
  en el repo.

## 2. Variables de Vercel **Production**

| Variable | Para qué | Estado |
|---|---|---|
| `BREVO_API_KEY` | Leer campañas y estadísticas de Brevo (llave **nueva** de solo lectura «dashboard-marketing-lectura») | Puesta. Confirmar que es la nueva y no la vieja |
| `BREVO_WEBHOOK_SECRET` | Contraseña que Brevo manda en cada aviso del webhook (autenticación Básica, usuario «brevo») | Puesta. **Debe ser igual** a la contraseña configurada en el webhook de Brevo |
| `MKT_SUPABASE_URL` | Dirección del proyecto Supabase «Dashboard Canales de marketing» | Puesta |
| `MKT_SUPABASE_SECRET_KEY` | Llave secreta de ese proyecto (eventos del webhook, cargo y objetivo) | Puesta («la llave de Supabase»): confirmar que el nombre es exactamente este |
| `MKT_CLAVE_EDICION` | Clave de Marketing para Guardar en «Cargo y objetivo» y para firmar el permiso de 8 h | Puesta |
| `CC_DB_PASSWORD` | Contraseña de la base de Cumplimiento de Clientes (solo lectura, con candados) | Puesta. Cambiar por el usuario de solo lectura cuando exista (PENDIENTES) |
| `CRON_SECRET` | Clave que Vercel manda al cron diario; sin ella la ruta responde 401 y Supabase puede pausarse | **Falta.** Texto al azar de 16 caracteres o más, tipo Secret |
| `MKT_MOSTRAR_CORREOS` | Opcional. Vacía = se muestran correos sin inicio de sesión; `no` = solo conteos | Opcional: depende de lo que apruebe Eduardo |
| `CC_DB_HOST` | Opcional. Otro servidor para Cumplimiento; vacía = el pooler de siempre | No ponerla |
| `MKT_REDES_VISIBLE` | Opcional. `si` muestra Redes en Production; vacía = «Próximamente» | No ponerla todavía |
| `PROSPEKT_API_KEY` | Leer los leads calificados de Prospekt IA para Mailing (solo GET, encabezado `X-API-Key`). Aparte de `RED_API_KEY`, aunque pueda tener el mismo valor | **Falta.** Tipo Secret. Sin ella, Mailing funciona y la parte de leads avisa |

**Opcional (Redes):** `TIPO_CAMBIO_GTQ_USD` (quetzales por 1 US$ para la pauta de Guatemala). Si no se pone, se usa 7.64
(por confirmar con Isma o Contabilidad).

**Ya existen y no cambian:** las de los otros dashboards (`RED_API_KEY`, `SAC_*`, Workflow, SAP, Firebase, etc.).

**Quitar de Vercel** (ya no las lee nadie):
- `GOOGLE_SERVICE_ACCOUNT_JSON`, `MARKETING_DRIVE_FOLDER_ID`, `MARKETING_LOCAL_CSV_DIR`, `MARKETING_DETALLE_CLAVE`
  (Mailing viejo con Google Drive).
- `VITE_BREVO_API_KEY` si existe: ningún código la lee y todo lo que empieza con `VITE_` puede llegar al navegador.
- La `BREVO_API_KEY` **vieja** (si sigue en Preview o en otro ambiente): confirmar con Eduardo de quién es antes de
  borrarla.

**No hacen falta todavía:** `META_TOKEN`, `META_APP_SECRET`, `META_API_VERSION` (Redes, cuando exista el token).

## 3. Checklist de pruebas en producción (después del merge)

**Antes del merge**
- [ ] `CRON_SECRET` puesta en Production (y las 6 de la tabla revisadas).
- [ ] La versión de Preview de la rama funciona igual (Mailing completo, Redes con datos de ejemplo).
- [ ] Eduardo aprobó (sección 4).

**Publicación**
- [ ] El deploy de Production terminó sin errores (Vercel → Deployments).
- [ ] Vercel → Settings → **Cron Jobs**: aparece `/api/marketing/mantener-supabase` a las `0 12 * * *`.
- [ ] Anotar el deploy anterior para poder volver atrás (Vercel → Deployments → «Instant Rollback»).

**Pantallas** (en el dominio de producción, Marketing → Canales de marketing)
- [ ] Mailing carga las campañas y abajo dice «Datos de Brevo de las HH:MM» → `BREVO_API_KEY` bien.
- [ ] Detalle por correo tiene filas → `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY` bien.
- [ ] Cliente, País y Ejecutivo llenos, sin el aviso «no disponibles» → `CC_DB_PASSWORD` bien.
- [ ] Comparar: «Por campaña», «Por comercial» y «Por ejecutivo y territorio».
- [ ] Leads: la tarjeta de Resultados generales y la sub-pestaña Leads muestran los leads, sin el aviso «falta configurar la llave» → `PROSPEKT_API_KEY` bien.
- [ ] Correos por corregir: ventana del ejecutivo completa, correo con diseño y exportar CSV.
- [ ] Cargo y objetivo: con la clave de Marketing, guardar el cargo de una campaña de **prueba** y luego «Volver a lo
      sugerido» → `MKT_CLAVE_EDICION` y escritura en `mkt_campana_cargo` bien.
- [ ] PDF de Mailing descarga con los filtros puestos.
- [ ] **Redes sociales dice «Próximamente»** (no la pantalla de ejemplo). Solo hay 2 pestañas: Mailing y Redes sociales.
- [ ] El menú se esconde y se asoma con el mouse, y el dashboard se corre sin quedar tapado.
- [ ] Los demás dashboards abren igual que antes: Ingresos, Facturación, Flujo de ventas, Flash de altas, SAC, Bodega.

**Cron (Supabase Free)**
- [ ] Vercel → Cron Jobs → «Run» en el cron → en Logs responde 200 (`{"ok":true,…}`).
- [ ] Abrir `https://<dominio de producción>/api/marketing/mantener-supabase` en el navegador → **401** (sin la clave
      no hace nada).
- [ ] Al día siguiente, en Logs, la corrida de las 12:00 UTC con 200.

**Webhook de Brevo: pasar a producción y quitar el bypass**
1. [ ] En Brevo, en la pantalla de Webhooks (donde se creó el 23/11) → «Dashboard Canales de marketing» → editar la URL a
       `https://<dominio de producción>/api/marketing/brevo-webhook`.
2. [ ] Dejar la autenticación Básica: usuario `brevo`, contraseña = el valor de `BREVO_WEBHOOK_SECRET` de **Production**.
3. [ ] **Quitar** el encabezado `x-vercel-protection-bypass` del webhook en Brevo (Production no lo necesita).
4. [ ] Guardar y probar: el botón de prueba de Brevo, o la siguiente campaña real. En Vercel → Logs la ruta responde
       200 y en Detalle por correo aparecen los eventos nuevos con origen «Webhook».
5. [ ] En Vercel → Settings → Deployment Protection → **Protection Bypass for Automation**: borrar el código de bypass
       («prueba-webhook-brevo»).
6. [ ] Comprobar que la URL vieja de Preview ya no recibe avisos (Logs de Preview sin llamadas nuevas).

**Limpieza**
- [ ] Quitar las variables viejas de la sección 2.
- [ ] Correr el SQL 005 (campaña [PRUEBA] 80) después de su segunda revisión.
- [ ] Anotar en BITACORA la fecha de publicación y quitar de PENDIENTES lo que quedó hecho.

## 4. Borrador del mensaje para Eduardo

> Hola, Eduardo. Quiero publicar en producción **Canales de marketing → Mailing** (rama `feature/marketing-v2`).
> Antes necesito tu aprobación.
>
> **Qué se sube:** Mailing completo con datos de Brevo (solo lectura), eventos del webhook en un Supabase propio
> («Dashboard Canales de marketing»), cruce **solo lectura** con Cumplimiento de Clientes y la pestaña «Cargo y
> objetivo», que guarda con una clave de Marketing. Redes sociales queda en «Próximamente». Se agrega una tarea diaria
> (cron de Vercel) para que el Supabase Free no se pause. Fuera de Marketing solo cambian `PortalLayout.tsx` (el menú
> se esconde en esta página), `vite.config.ts` y `vercel.json`, y se borra el Mailing viejo de Google Drive.
>
> **Riesgos de seguridad conocidos:**
> 1. **Correos de clientes visibles sin inicio de sesión** en Mailing (decisión mía mientras no haya login real). Se
>    pueden ocultar con `MKT_MOSTRAR_CORREOS = no` (solo conteos).
> 2. **El login del portal acepta cualquier usuario y contraseña:** no se verifica en el servidor.
> 3. **Claves reales en el historial de `.env.example`** (también en `main`): SAP, Workflow, contraseñas maestras,
>    webhooks de Make y llaves públicas de Supabase/Firebase. Hay que cambiarlas.
> 4. **Contraseña escrita en `src/context/AuthContext.tsx`** (usuario semilla) y **`VITE_MASTER_*`**, que llegan al
>    navegador; además una llave tipo Google escrita en `src/config/env.ts`.
> 5. Cumplimiento se lee con la contraseña principal de la base (con candados de solo lectura); falta un usuario de
>    solo lectura y cambiar esa contraseña, que estuvo en un documento.
>
> **Necesito que apruebes:**
> - Hacer el merge de `feature/marketing-v2` a `main` y publicar.
> - Que los correos se vean sin login por ahora, o que los ocultemos con `MKT_MOSTRAR_CORREOS = no` hasta tener login.
> - Que las rutas de Mailing queden abiertas en producción hasta tener inicio de sesión real.
> - Quién y cuándo cambia las claves de los puntos 3 y 4, y si creamos el usuario de solo lectura de Cumplimiento.
> - Borrar de Vercel la `BREVO_API_KEY` vieja y las 4 variables del Mailing viejo.
>
> Gracias.
