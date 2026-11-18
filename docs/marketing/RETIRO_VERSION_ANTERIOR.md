# Retiro del Flujo de ventas anterior

El HTML anterior (`public/dashboards/marketing/flujo-ventas.html`) se conserva como respaldo,
pero ya no está disponible desde el menú del portal. El menú **Flujo de ventas** abre la v2.
La v2 necesita `RED_API_KEY` configurada en Vercel para cargar los datos.

| Etapa | Cuándo | Qué se hace | ¿Se puede deshacer? |
|---|---|---|---|
| **1. Convivencia** | Completada | Ambas versiones estuvieron disponibles durante la construcción y revisión. | — |
| **2. Cambio en el menú** | Completado el 12/11/2026 | "Flujo de ventas" abre la v2. El HTML anterior queda guardado, fuera del menú, como respaldo. | Sí, revirtiendo el cambio en `PortalLayout.tsx` |
| **3. Limpieza física** | Pendiente | Borrar el HTML/CSS y las variables exclusivas del dashboard anterior después de revisar sus usos. No se toca Supabase ni el servicio de Redes sociales. | Sí, desde el historial de Git |

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
