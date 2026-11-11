# Retiro del Flujo de ventas anterior

El dashboard actual (`public/dashboards/marketing/flujo-ventas.html`) **no se borra
de golpe**. Se retira en tres etapas para que nadie se quede sin información.

| Etapa | Cuándo | Qué se hace | ¿Se puede deshacer? |
|---|---|---|---|
| **1. Convivencia** | Mientras se construye la v2 | El viejo sigue en el menú. La v2 se prueba aparte. | — |
| **2. Cambio en el menú** | Cuando la v2 esté aprobada | "Flujo de ventas" del menú apunta a la v2. El archivo viejo se queda en el repo, pero ya nadie llega a él. | Sí, cambiando una línea en `PortalLayout.tsx` |
| **3. Limpieza** | 2 a 4 semanas después, si nadie lo necesitó | Se borra el archivo viejo y lo que solo él usaba. Git conserva el historial por si hiciera falta recuperarlo. | Sí, desde el historial de Git |

## Qué se quita en la etapa 3

Solo lo que use **únicamente** el Flujo de ventas viejo:

- `public/dashboards/marketing/flujo-ventas.html`
- `public/assets/css/flujoVentas.css` (verificar antes que nadie más lo use)
- Variables de `.env.example`: `VITE_MARKETING_SUPABASE_URL`, `VITE_MARKETING_SUPABASE_KEY`,
  `VITE_MARKETING_RRSS_URL` (verificar antes que nadie más las use)

## Qué NO se toca

- `public/dashboards/marketing/mailing-campanas.html` (Campañas de correo): es otro dashboard.
- El proyecto de Supabase `marketing-pipeline-leads` y su robot de carga: se quedan como
  están. Se decide aparte si se apagan, porque sus datos (historial desde agosto) pueden
  servir después.
- El servidor de Redes sociales en Render: lo usará el futuro dashboard de Marketing.
