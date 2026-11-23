-- Dashboard Canales de marketing · destino del clic en los eventos (solo nuestra tabla de Marketing).
-- Proyecto Supabase: «Dashboard Canales de marketing» (NO es Cumplimiento de Clientes). Se corre UNA vez, a mano, en el
-- SQL Editor, DESPUÉS de 001 y 002. No lleva llaves ni datos. Documentación: docs/marketing/v2/MAILING.md, sección 10.
--
-- Qué se guarda (lo limpia el servidor antes de guardar): solo dominio + ruta del enlace, SIN lo que va después de «?»
-- ni de «#» (ahí suelen ir datos de la persona o códigos de seguimiento). Los enlaces de baja no se guardan: quedan
-- marcados como «ENLACE_DE_BAJA».

alter table public.mkt_brevo_eventos
  add column if not exists url text;  -- destino del clic (limpio); vacío en los demás eventos

-- El candado (RLS) y los permisos no cambian: solo el servidor, con la llave secreta, lee y escribe.

-- Comprobación: debe mostrar la columna nueva.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mkt_brevo_eventos' and column_name = 'url';
