# Pendientes · Flash de altas

| Pendiente | Quién | Fecha | Estado |
|---|---|---|---|
| **El repo `DASHBOARD_CENTRALIZADO_INTERNO` es público.** Decidir con Eduardo si pasa a **privado** y si se **limpia el historial**: quitar datos o llaves de un archivo **no** los borra del historial (los commits viejos siguen descargables) | Keily → Eduardo | 2026-11-25 | Por decidir |
| **Llave de Workflow escrita en el repo:** sigue en `public/dashboards/activaciones/activaciones.html` y `src/components/modals/SecretsModal.tsx` de `main` (y en el historial desde el 11/11). Pedir que la **cambien** en Workflow, ponerla nueva en `WORKFLOW_API_KEY` y quitarla de esos archivos. No se tocaron desde Flash | Otra persona (Activaciones) / administrador de Workflow | 2026-11-25 | Pendiente |
| **Datos de clientes en el historial:** la copia de respaldo de `flash-altas.html` (3,987 filas con nombres) se quitó del archivo el 25/11/2026, pero sigue en los commits anteriores. Además, `server/flashAltas/prueba/datos-fijos-2026-11-18.json` (4,366 filas con nombres) está en la rama `ventas-flash-altas` y en el PR #8 (abierto) | Keily → Eduardo | 2026-11-25 | Por decidir |
| Poner `FLASH_API_KEY` y `WORKFLOW_API_KEY` en Vercel (Preview y Production) y en `.env.local` | Keily | 2026-11-25 | Pendiente |
| Probar `/api/ventas/flash-altas` con la llave real y comparar el total con el `datos.json` del robot | Keily | 2026-11-25 | Pendiente |
| Que el reporte por correo (Supabase `reporte-flash-publico`) y Activaciones lean de este servidor; después se puede apagar el robot y `datos.json` público (con nombres de clientes) | Keily / dueño del repo del robot | 2026-11-25 | Pendiente |
| Pedir a TI que SAN tenga `https` (hoy la llave viaja sin cifrar, igual que con el robot) | TI | 2026-11-25 | Pendiente |
| Las rutas `/api/ventas/*` no piden inicio de sesión (igual que antes `datos.json`). Cerrarlas con la sesión del portal sería otro trabajo | Keily | 2026-11-25 | Por decidir |
| **Vendedores en 0:** los que nunca vendieron no salen porque no están en los datos. Hace falta un catálogo de vendedores (código SAN, nombre, país, grupo comercial, activo) (de la rama vieja, 18/11) | Ventas | 2026-11-18 | Pendiente |
| **Ventas de leads calificados vs. no:** no hay un dato en común entre SAN / Workflow y Prospekt (NIT, teléfono, correo o ID). Pista: el `codigo` de algunas preofertas empieza con `LD…` (formato de Prospekt) (de la rama vieja, 18/11) | TI | 2026-11-18 | Pendiente |
