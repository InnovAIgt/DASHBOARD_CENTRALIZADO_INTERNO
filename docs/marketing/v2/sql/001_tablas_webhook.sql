-- Dashboard Canales de marketing · tablas del webhook de Brevo y del cargo por campaña.
-- Proyecto Supabase: «Dashboard Canales de marketing» (solo para este dashboard).
-- Se corre UNA vez, a mano, en el SQL Editor de ese proyecto. No lleva llaves ni datos.
-- Documentación: docs/marketing/v2/MAILING.md, sección 10.2.

-- Eventos que manda el webhook de marketing de Brevo (solo campañas nuevas).
-- La columna «evento» acepta cualquier nombre: si Brevo manda uno nuevo, se guarda igual y se filtra después.
create table public.mkt_brevo_eventos (
  id           bigint generated always as identity primary key,
  huella       text not null unique,          -- evento|campaña|correo|fecha: evita duplicados
  evento       text not null,                 -- delivered, opened, click, soft_bounce, hard_bounce, spam, ...
  campana_id   bigint not null,
  correo       text not null,                 -- en minúsculas y sin espacios
  fecha_evento timestamptz not null,
  fecha_envio  timestamptz,
  motivo       text,                          -- solo rebotes y spam (texto original de Brevo)
  recibido_en  timestamptz not null default now()
);
create index mkt_brevo_eventos_campana on public.mkt_brevo_eventos (campana_id);
create index mkt_brevo_eventos_correo  on public.mkt_brevo_eventos (correo);

-- Cargo elegido a mano por campaña (sub-pestaña «Asignar cargo a campañas»).
create table public.mkt_campana_cargo (
  campana_id   bigint primary key,
  cargo        text not null check (cargo in ('GG', 'GF', 'GO')),
  asignado_por text,
  asignado_en  timestamptz not null default now()
);

-- Candado: nadie de afuera lee ni escribe; solo el servidor (llave secreta).
alter table public.mkt_brevo_eventos enable row level security;
alter table public.mkt_campana_cargo enable row level security;
revoke all on public.mkt_brevo_eventos, public.mkt_campana_cargo from anon, authenticated;
grant select, insert, update, delete on public.mkt_brevo_eventos, public.mkt_campana_cargo to service_role;

-- Comprobación: debe mostrar las 2 tablas con relrowsecurity = true.
select relname, relrowsecurity
  from pg_class
 where relname in ('mkt_brevo_eventos', 'mkt_campana_cargo');
