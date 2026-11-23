/**
 * Cumplimiento de Clientes · lectura de la base (SOLO LECTURA, regla de CLAUDE.md).
 *
 * Decisión de Keily (administradora de la app): usar su base solo para LEER y llenar Cliente, País y Ejecutivo de
 * cada correo de Mailing. Este archivo nunca escribe, cambia ni borra nada en ese proyecto:
 *  1. La conexión pide `default_transaction_read_only=on` (opción de arranque de Postgres).
 *  2. Cada consulta corre dentro de una transacción `READ ONLY` con `statement_timeout`, y SIEMPRE termina con
 *     ROLLBACK (nunca se confirma nada).
 *  3. `exigirSoloLectura` rechaza cualquier texto que no sea una sola consulta SELECT / WITH.
 *  4. La prueba server/clientes/soloLectura.test.js FALLA si algún archivo de esta carpeta contiene una operación
 *     de escritura.
 *
 * Variable de servidor (sin VITE_): CC_DB_URL = cadena de conexión del pooler de Supabase (puerto 6543).
 * Nunca se usa SUPABASE_ACCESS_TOKEN ni llaves de servicio. Los correos se usan solo dentro del servidor.
 *
 * Tablas (repo InnovAIgt/CumplimientoClientes, supabase/schema.sql): clientes (id, codigo, pais, nombre,
 * ejecutivo_id), ejecutivos (id, nombre, usuario) y contactos (cliente_id, cargo gg/gf/go, email).
 */
import pg from 'pg'

export const CC_ESPERA_MS = 10_000
export const CC_CACHE_MS = 30 * 60 * 1000

/** Única consulta que usa el cruce: un renglón por contacto con correo, con su cliente y su ejecutivo. */
export const CONSULTA_CRUCE = `
  select c.pais, c.codigo, c.nombre as cliente, e.nombre as ejecutivo, e.usuario as usuario_ejecutivo,
         k.cargo, k.email
    from public.clientes c
    join public.ejecutivos e on e.id = c.ejecutivo_id
    join public.contactos k on k.cliente_id = c.id
   where k.email <> ''`

/** Conteos (sin datos personales) para la primera revisión. */
export const CONSULTA_CONTEOS = `
  select (select count(*) from public.clientes) as clientes,
         (select count(*) from public.ejecutivos) as ejecutivos,
         (select count(*) from public.contactos) as contactos,
         (select count(*) from public.contactos where email <> '') as contactos_con_correo`

const PROHIBIDAS = /\b(insert|update|delete|merge|truncate|alter|create|drop|grant|revoke|call|do|copy|lock|vacuum|refresh|comment|reindex|cluster|listen|notify|prepare|execute|security|set|reset|begin|commit|rollback|savepoint|set_config|dblink\w*|pg_\w+)\b/i

/** Lanza un error si el texto no es UNA sola consulta de lectura (SELECT o WITH … SELECT). */
export function exigirSoloLectura(sql) {
  const limpio = String(sql ?? '').replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').trim()
  if (!/^(select|with)\b/i.test(limpio)) throw new Error('Cumplimiento: solo se permiten consultas SELECT.')
  if (limpio.replace(/;\s*$/, '').includes(';')) throw new Error('Cumplimiento: una sola consulta por vez.')
  if (PROHIBIDAS.test(limpio)) throw new Error('Cumplimiento: la consulta tiene una palabra no permitida (solo lectura).')
  if (/\bfor\s+(no\s+key\s+)?(share|key\s+share)\b/i.test(limpio)) throw new Error('Cumplimiento: no se permiten bloqueos.')
  return limpio
}

/** Arma el cliente de Postgres en modo solo lectura (no conecta todavía). */
export function clienteSoloLectura(env = process.env, Cliente = pg.Client) {
  const url = String(env?.CC_DB_URL ?? '').trim()
  if (!url) throw new Error('Cumplimiento: falta la variable CC_DB_URL.')
  return new Cliente({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    options: '-c default_transaction_read_only=on',
    statement_timeout: CC_ESPERA_MS,
    query_timeout: CC_ESPERA_MS + 2_000,
    connectionTimeoutMillis: CC_ESPERA_MS,
    application_name: 'dashboard-canales-marketing (solo lectura)',
  })
}

/**
 * Corre UNA consulta de lectura en una transacción READ ONLY y siempre deshace al final.
 * @returns {Promise<object[]>} filas
 */
export async function leerSoloLectura(sql, { env = process.env, Cliente = pg.Client } = {}) {
  const consulta = exigirSoloLectura(sql)
  const cliente = clienteSoloLectura(env, Cliente)
  await cliente.connect()
  try {
    await cliente.query('BEGIN TRANSACTION READ ONLY')
    await cliente.query(`SET LOCAL statement_timeout = ${Number(CC_ESPERA_MS)}`)
    const r = await cliente.query(consulta)
    return r.rows
  } finally {
    try { await cliente.query('ROLLBACK') } catch { /* la conexión ya se cierra */ }
    await cliente.end().catch(() => {})
  }
}

let copia = null // { filas, vence }

/** Solo para pruebas. */
export function vaciarCacheCumplimiento() { copia = null }

/** Contactos con correo de Cumplimiento (caché de 30 min en el servidor). */
export async function contactosCumplimiento({ env = process.env, Cliente = pg.Client, ahora = Date.now() } = {}) {
  if (copia && copia.vence > ahora) return copia.filas
  const filas = await leerSoloLectura(CONSULTA_CRUCE, { env, Cliente })
  copia = { filas, vence: ahora + CC_CACHE_MS }
  return filas
}
