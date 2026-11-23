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
| Crear el webhook de marketing en Brevo, avisando a Ismael | Keily | Por confirmar | Pendiente |
| Correr `docs/marketing/v2/sql/001_tablas_webhook.sql` en el proyecto «Dashboard Canales de marketing» | Keily | 2026-11-20 | Resuelto: 2 tablas con RLS; con llave secreta 200 y sin llave 401 |
| Tarea diaria para que el proyecto Free no se pause (Vercel cron con `CRON_SECRET`; solo corre en producción) | Keily | Después de probar el webhook | Pendiente |
| Prueba local real de la ruta del webhook: 2 eventos inventados, revisar que se guarden y borrarlos (con el «sí» de Keily, después de correr el SQL) | Keily | 2026-11-20 | Resuelto: 2 guardados, el reenvío se ignoró (sin duplicados), borrados; tabla en 0 |
| Poner en Vercel `BREVO_WEBHOOK_SECRET`, `MKT_SUPABASE_URL` y `MKT_SUPABASE_SECRET_KEY` (Preview y después Production) | Keily | 2026-11-20 | Preview hecho (como Secret); Production pendiente al publicar |
| Confirmar en cuál de los 2 proyectos de Vercel (`dashboard.centralizado` o `dashboard.centralizado.interno`) se hace la prueba del webhook y se pusieron las variables | Keily | 2026-11-23 | Resuelto: `dashboard.centralizado.interno` (variables de Preview y código de bypass «prueba-webhook-brevo» ahí) |
| Preguntar a Eduardo para qué es el proyecto de Vercel `dashboard.centralizado` (también arma versiones de prueba de este repo) | Eduardo | Por confirmar | Pendiente |
| Versión de prueba: la ruta del webhook pasa la protección y la clave, pero responde 429 al guardar. Revisar en Vercel el mensaje «[Brevo webhook] no se pudo guardar» y las variables `MKT_SUPABASE_URL` / `MKT_SUPABASE_SECRET_KEY` de Preview | Keily | 2026-11-23 | Pendiente |
| Al crear el webhook en Brevo, ver si la pantalla permite el encabezado `x-webhook-token` o solo usuario:clave en la dirección | Keily | Al crear el webhook | Pendiente |
| Definir el respaldo de los eventos del webhook | Keily | Por definir | Pendiente |
| Limpieza mensual de eventos con más de 12 meses | Keily | Más adelante | Pendiente |
| Inicio de sesión real del portal (hasta entonces, las rutas con correos devuelven solo totales) | Keily | Por definir | Pendiente |
| Confirmar si se ocultan las campañas de prueba | Ismael | Por confirmar | Pendiente |
| Comparar en la pantalla de Brevo la campaña 74 (157 entregados, 44 aperturas, 3 clics) para decidir entre `globalStats` y `campaignStats` (por ahora se usa `globalStats`) | Keily | Por confirmar | Pendiente |
| Acceso a Meta: Business Manager, páginas por marca y país, cuentas de anuncios | Erick / Ismael | 2026-11-20 | Pendiente |
| Acceso al CRM o bot de leads | Ismael | Por confirmar | Pendiente |
| Permiso de lectura de la base de Cumplimiento de Clientes | Keily | — | Pendiente |
| Regla de nombres de campaña entregada a Marketing | Ismael / Laura | Por confirmar | Pendiente |
| Enlace «IR A CORREGIR» desactualizado; el correcto es https://cumplimientoclientes-88n2.onrender.com | Ismael | Por confirmar | Pendiente |
| Definición de «lectura» e indicadores de Redes | Ingeniero | Por confirmar | Pendiente |
| Correo del lead en la API de Prospekt | Equipo Prospekt IA | Por confirmar | Pendiente |
| Explicar a Marketing las diferencias de clasificación con la plantilla (MAILING.md, sección 9) | Ismael / Laura | Por confirmar | Pendiente |
| Decidir dónde se guarda el cargo elegido por campaña (Supabase u otro) | Keily | — | Pendiente |
| Confirmar con Ismael quién puede editar los cargos | Ismael | Por confirmar | Pendiente |
| Preguntar a Eduardo si el estado «Sin confirmación» se quita del dashboard o se deja (en la reunión dijo que no debería existir) | Eduardo | Por confirmar | Pendiente |
| Quitar de Vercel las 4 variables viejas | Keily / TI | Al publicar | Pendiente |
| Valores reales en .env.example del historial del repo (SAP, Workflow, contraseñas maestras, webhooks de Make, llaves públicas de Supabase/Firebase) (también en origin/main hoy), y llave tipo Google escrita directo en `src/config/env.ts`: TI debe cambiarlos | Eduardo / TI | 2026-11-20 | Pendiente |
| Vaciar .env.example en main con un PR aparte y pequeño | Keily (con OK de Eduardo) | — | Pendiente |
| Borrar el código de bypass de Vercel al terminar la prueba del webhook | Keily | — | Pendiente |

Las 4 variables viejas (solo nombres): `GOOGLE_SERVICE_ACCOUNT_JSON`, `MARKETING_DRIVE_FOLDER_ID`,
`MARKETING_LOCAL_CSV_DIR` y `MARKETING_DETALLE_CLAVE`.
