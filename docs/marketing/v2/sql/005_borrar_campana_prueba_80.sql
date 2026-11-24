-- Canales de marketing · Mailing · Limpieza de la campaña [PRUEBA] Webhook dashboard (id 80).
-- Proyecto Supabase: «Dashboard Canales de marketing» (NO Cumplimiento de Clientes). Lo corre Keily en el SQL Editor.
-- Correr DESPUÉS de la segunda revisión de la campaña 80 (clics y proxy_open, PENDIENTES.md): al borrar se pierde
-- esa evidencia. Solo toca la tabla mkt_brevo_eventos y solo la campaña 80.
-- IMPORTANTE: en el SQL Editor, SELECCIONAR y correr un paso a la vez (si se aprieta «Run» sin selección, corre todo
-- el archivo).

-- PASO 1 · Ver cuántos eventos hay (no cambia nada).
select evento, origen, count(*) as eventos, count(distinct correo) as correos,
       min(fecha_evento) as primero, max(fecha_evento) as ultimo
  from public.mkt_brevo_eventos
 where campana_id = 80
 group by evento, origen
 order by evento, origen;

select count(*) as total_campana_80 from public.mkt_brevo_eventos where campana_id = 80;

-- PASO 2 · Borrar. Cambiar 0 por el total del paso 1 (total_campana_80). Si mientras tanto llegó otro evento y el
-- número ya no coincide, no se borra nada (devuelve borrados = 0) y se vuelve al paso 1.
with borrados as (
  delete from public.mkt_brevo_eventos
   where campana_id = 80
     and (select count(*) from public.mkt_brevo_eventos where campana_id = 80) = 0   -- ← poner aquí el total
  returning 1
)
select count(*) as borrados from borrados;

-- PASO 3 · Comprobar que quedó en 0.
select count(*) as quedan_campana_80 from public.mkt_brevo_eventos where campana_id = 80;
