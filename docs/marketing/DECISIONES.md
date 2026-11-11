# Decisiones del Flujo de ventas v2

Cada decisión con su fecha, qué se decidió y por qué.

## D1 · 11/11/2026 · Reconstruir en vez de arreglar

**Decisión:** construir una versión nueva del Flujo de ventas en vez de corregir el
archivo actual (`flujo-ventas.html`, ~4,400 líneas).
**Por qué:** el ingeniero cambió la base del dashboard (solo calificados, 6 etapas,
tiempos). Quitar Redes sociales y Datared del archivo viejo obliga a tocar muchas partes.

## D2 · 11/11/2026 · Todo dentro del centralizado

**Decisión:** el Flujo de ventas vive completo en `DASHBOARD_CENTRALIZADO_INTERNO`,
sin depender de otro repositorio.
**Por qué:** un solo lugar para mantener, revisar y documentar.

## D3 · 11/11/2026 · Usar la API de reuniones de Prospekt IA en vivo, con la lógica de DashboardLeads

**Decisión:** consultar `https://prospektia.red.com.sv/api/metrics/reuniones` en vivo,
reutilizando la lógica de la "Vista 1: Dashboard General" de `InnovAIgt/DashboardLeads`.
**Por qué:** ya está probada, valida que las cifras cuadren y trae país, asesor, etapa,
calificación, fechas y unidades.
**Pendiente:** avisar a José Zeta (responsable de DashboardLeads).

## D4 · 11/11/2026 · La llave solo vive en el servidor

**Decisión:** el navegador llama a `/api/marketing/reuniones` (del mismo centralizado) y
esa función agrega `RED_API_KEY`. La variable **no** lleva prefijo `VITE_`.
**Por qué:** así la llave nunca aparece en la página ni en el repositorio.

## D5 · 11/11/2026 · Sin robot ni base de datos por ahora

**Decisión:** la v2 no usa el robot de carga ni Supabase para lo básico.
**Por qué:** la API en vivo alcanza para indicadores, embudo y filtros. Solo se agregaría
una base de datos si la API no trae las fechas por etapa (ver REQUISITOS R6).

## D6 · 11/11/2026 · El dashboard viejo no se borra hasta el final

**Decisión:** el Flujo de ventas actual sigue en el menú hasta que la v2 esté aprobada.
Ver [RETIRO_VERSION_ANTERIOR.md](RETIRO_VERSION_ANTERIOR.md).
**Por qué:** que nadie se quede sin dashboard mientras se construye.

## D7 · 11/11/2026 · Trabajo en rama aparte

**Decisión:** los cambios van en la rama `leads`; nada se sube
directo a `main`.
**Por qué:** poder revisar cada paso antes de publicarlo.

## D8 · 11/11/2026 · Qué datos del cliente llegan al navegador

**Decisión:** se conserva `client_name` porque el negocio necesita ver el nombre del
cliente; se elimina `client_phone` porque el dashboard no lo usa. El teléfono se quita en
el servidor (`server/marketingReuniones.js`) antes de responder, así nunca llega al
navegador.
**Por qué:** no enviar datos personales que la pantalla no necesita.
**Pendiente:** agregar login para proteger los datos de clientes.
