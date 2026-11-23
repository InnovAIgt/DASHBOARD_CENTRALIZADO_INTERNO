-- Canales de marketing · 004 · Objetivo de cada campaña (sub-pestaña «Cargo y objetivo»).
-- Proyecto Supabase: «Dashboard Canales de marketing» (NO es Cumplimiento de Clientes). Lo corre Keily.
--
-- Qué hace:
--  1. El cargo deja de ser obligatorio: una campaña puede tener solo el objetivo confirmado.
--  2. Agrega «objetivo» como TEXTO LIBRE (sin límite de valores: Marketing puede escribir otros, por ejemplo
--     «Promover el dashboard de rondas»). La lista de 8 + «Promoción general de RED» solo son sugerencias.
--  3. Agrega cuándo se asignó el objetivo.
--  4. Exige que cada fila tenga al menos el cargo o el objetivo.
-- No cambia permisos: la tabla sigue cerrada para anon/authenticated; solo el servidor (llave secreta) la usa.

alter table public.mkt_campana_cargo alter column cargo drop not null;

alter table public.mkt_campana_cargo add column if not exists objetivo text;
alter table public.mkt_campana_cargo add column if not exists objetivo_asignado_en timestamptz;

alter table public.mkt_campana_cargo
  add constraint mkt_campana_cargo_cargo_u_objetivo check (cargo is not null or objetivo is not null);

-- Revisión (debe mostrar las columnas campana_id, cargo, asignado_por, asignado_en, objetivo, objetivo_asignado_en):
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'mkt_campana_cargo'
 order by ordinal_position;
