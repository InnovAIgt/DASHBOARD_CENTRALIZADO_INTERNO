-- Dashboard Canales de marketing · columnas para la carga inicial del historial (CSV de Brevo).
-- Proyecto Supabase: «Dashboard Canales de marketing». Se corre UNA vez, a mano, en el SQL Editor, DESPUÉS de
-- 001_tablas_webhook.sql. No lleva llaves ni datos. Documentación: docs/marketing/v2/MAILING.md, sección 10.3.

alter table public.mkt_brevo_eventos
  add column if not exists origen text not null default 'webhook' check (origen in ('webhook', 'historial')),
  add column if not exists cantidad integer,                               -- aperturas totales o aperturas Apple MPP
  add column if not exists fecha_aproximada boolean not null default false; -- clic sin fecha en el CSV

-- Los eventos que ya llegaron por el webhook quedan con origen = 'webhook' (valor por defecto).
-- El candado (RLS) y los permisos no cambian: solo el servidor, con la llave secreta, lee y escribe.

-- Comprobación: debe mostrar las 3 columnas nuevas.
select column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mkt_brevo_eventos'
   and column_name in ('origen', 'cantidad', 'fecha_aproximada')
 order by column_name;
