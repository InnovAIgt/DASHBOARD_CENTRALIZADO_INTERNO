# Marketing v2 · Dashboard de Marketing

> Dashboard de **Marketing** (Mailing, Redes sociales y Otros). **Flujo de ventas** es otro dashboard y su
> documentación está en [`docs/marketing/README.md`](../README.md).

Estado: **en construcción** en la rama `feature/marketing-v2` (sin publicar). Parte 2: estructura lista, sin datos.

## Qué es

Un solo dashboard de Marketing en el portal: menú **Marketing → Canales de marketing** (debajo de Flujo de ventas),
con 3 pestañas:

| Pestaña | Qué muestra | Detalle |
|---|---|---|
| **Mailing** | Campañas de correo hechas y programadas: entrega, apertura, clic, lectura y leads, en general y por territorio de cada comercial. | [MAILING.md](MAILING.md) |
| **Redes sociales** | Publicaciones hechas y programadas por marca y país, con sus leads. | [REDES.md](REDES.md) |
| **Otros** | Canales que no son correo ni redes. | Por definir |

## De dónde salen los datos

| Fuente | Cómo llega | Variable (solo nombre) |
|---|---|---|
| **Brevo** (correo) | API de Brevo, consultada desde **nuestro servidor**. | `BREVO_API_KEY` (solo servidor) |
| **Meta** (Facebook / Instagram) | API de Meta, consultada desde **nuestro servidor**. | Por definir (solo servidor) |
| **Cumplimiento de Clientes** | Base de la app CumplimientoClientes (Supabase): correos GG / GF / GO y ejecutivo de cada cliente. | Por definir (solo servidor) |
| **Leads** | Bot de WhatsApp → CRM. Los calificados también llegan a Prospekt IA (Flujo de ventas). | Por definir (CRM) · `RED_API_KEY` (Prospekt) |

Estado de cada acceso: [PENDIENTES.md](PENDIENTES.md).

## Dónde está el código

| Archivo | Para qué |
|---|---|
| `src/modulos/marketing/marketing-v2/MarketingV2.jsx` | Pantalla principal: encabezado y pestañas Mailing · Redes sociales · Otros |
| `src/modulos/marketing/marketing-v2/pantalla/Mailing.jsx` | Filtros globales y las 6 sub-pestañas de Mailing |
| `src/modulos/marketing/marketing-v2/pantalla/comunes.jsx` | Avisos de pendiente y de inicio de sesión, paneles y tablas vacías |
| `src/modulos/marketing/marketing-v2/marketing-v2.css` | Estilos propios (prefijo `mkv2-`) |
| `src/components/layout/PortalLayout.tsx` | Entrada del menú (id `marketing-v2`) |
| `server/brevoWebhook.js` | Recibe los avisos del webhook de Brevo (`POST /api/marketing/brevo-webhook`) |
| `server/mktSupabase.js` | Guarda en el proyecto Supabase «Dashboard Canales de marketing» (solo servidor) |
| `api/marketing/brevo-webhook.js` | La misma ruta en Vercel |
| `server/brevoWebhook.test.js` | Pruebas con datos inventados |

**Estilos:** reutiliza los de **Flujo de ventas** (`src/modulos/marketing/flujo-ventas-v2/flujo-ventas-v2.css`, clase
`fv2`) y su componente de banderas, **sin modificarlos**. Si cambian allá, cambian aquí. `marketing-v2.css` solo agrega
lo que falta y usa las mismas variables de color (`--fv2-*`), sin colores nuevos.

## Qué reemplazó

Se quitaron del portal el 20/11/2026 (commit `9d08356`, ver [BITACORA.md](BITACORA.md)):

| Antes | Qué era |
|---|---|
| **Marketing por canales** | Mailing con los CSV exportados de Brevo, leídos de una carpeta local o de Google Drive. |
| **Redes sociales** | Métricas de redes leídas de un Excel guardado en el repo. |
| **Campañas de correo** | Página HTML vieja donde se cargaban a mano los Excel de Brevo (guardaba todo en el navegador). |

## Seguridad

- Las llaves van **solo en el servidor** (variables sin `VITE_`). Todo lo que empieza con `VITE_` llega al navegador.
- **Nunca** se guardan en el repo, en las pruebas ni en las capturas: llaves, tokens, correos ni datos de clientes.
  Las pruebas usan datos inventados.
- Toda ruta que devuelva correos o datos de personas pide el **inicio de sesión del portal** (ver MAILING.md, Seguridad).

## Archivos de esta carpeta

- [BITACORA.md](BITACORA.md) — diario con fecha de lo que se hizo.
- [MAILING.md](MAILING.md) — borrador de la pestaña Mailing.
- [REDES.md](REDES.md) — borrador de la pestaña Redes sociales.
- [PENDIENTES.md](PENDIENTES.md) — lo que falta, a quién se le pidió y su estado.
- [sql/](sql/) — SQL de las tablas del proyecto Supabase «Dashboard Canales de marketing» (se corre a mano).
