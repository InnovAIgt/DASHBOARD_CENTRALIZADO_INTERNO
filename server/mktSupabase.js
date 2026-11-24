/**
 * Canales de marketing · conexión con el proyecto Supabase «Dashboard Canales de marketing».
 *
 * Solo servidor. Variables (sin VITE_): MKT_SUPABASE_URL y MKT_SUPABASE_SECRET_KEY.
 * Las tablas tienen RLS sin reglas: solo la llave secreta puede leer y escribir
 * (docs/marketing/v2/sql/001_tablas_webhook.sql). Se usa la API REST de Supabase con fetch,
 * sin paquetes nuevos. Los mensajes de error nunca incluyen correos ni la llave.
 */

export const MKT_ESPERA_MS = 8_000

/** Dirección y llave del proyecto; error (sin datos) si faltan o la dirección no es https. */
export function configuracionMkt(env = process.env) {
  const url = String(env?.MKT_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const llave = String(env?.MKT_SUPABASE_SECRET_KEY ?? '').trim()
  if (!url || !llave) throw new Error('faltan las variables MKT_SUPABASE_URL o MKT_SUPABASE_SECRET_KEY')
  let base
  try { base = new URL(url) } catch { throw new Error('MKT_SUPABASE_URL no es una dirección válida') }
  if (base.protocol !== 'https:') throw new Error('MKT_SUPABASE_URL debe ser https')
  return { url: base.href.replace(/\/+$/, ''), llave }
}

/**
 * Cargo y objetivo elegidos a mano por campaña (tabla mkt_campana_cargo). Solo campana_id, cargo y objetivo: no se lee
 * quién los asignó. Si la columna «objetivo» todavía no existe (falta correr el SQL 004), se lee solo el cargo.
 * @returns {Promise<Map<number, {cargo: string|null, objetivo: string|null}>>}
 */
export async function leerCargosManuales({ env = process.env, fetchFn = fetch, esperaMs = MKT_ESPERA_MS } = {}) {
  const { url, llave } = configuracionMkt(env)
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  try {
    const pedir = (campos) => fetchFn(`${url}/rest/v1/mkt_campana_cargo?select=${campos}`, { headers: { apikey: llave, Accept: 'application/json' }, signal: control.signal })
    let r = await pedir(CAMPOS_CARGO)
    if (r.status === 400) r = await pedir('campana_id,cargo') // antes del SQL 004 no existe «objetivo»
    if (!r.ok) throw new Error(`Supabase respondió HTTP ${r.status}`)
    const filas = await r.json()
    return new Map((Array.isArray(filas) ? filas : []).map((f) => [Number(f.campana_id), filaManual(f)]))
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Supabase no respondió en ${esperaMs / 1000} s`)
    throw err
  } finally {
    clearTimeout(reloj)
  }
}

// ---------- Escribir cargo y objetivo (sub-pestaña «Cargo y objetivo», protegido con clave de Marketing) ----------
// ÚNICA tabla en la que se escribe desde aquí: mkt_campana_cargo. Nunca Cumplimiento de Clientes ni Brevo.
export const TABLA_CARGO = 'mkt_campana_cargo'
const CAMPOS_CARGO = 'campana_id,cargo,objetivo,asignado_por,asignado_en,objetivo_asignado_en'

/** Fila de la tabla → lo elegido a mano (con quién y cuándo). */
const filaManual = (f) => ({
  cargo: f.cargo ?? null,
  objetivo: String(f.objetivo ?? '').trim() || null,
  asignadoPor: f.asignado_por ?? null,
  cargoAsignadoEn: f.cargo ? f.asignado_en ?? null : null,
  objetivoAsignadoEn: f.objetivo_asignado_en ?? null,
})

/** Llamada a la tabla de cargos (y solo a esa). */
async function pedirTablaCargo(consulta, { method = 'GET', body, prefer, env = process.env, fetchFn = fetch, esperaMs = MKT_ESPERA_MS } = {}) {
  const { url, llave } = configuracionMkt(env)
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  try {
    const r = await fetchFn(`${url}/rest/v1/${TABLA_CARGO}?${consulta}`, {
      method,
      headers: { apikey: llave, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(prefer ? { Prefer: prefer } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: control.signal,
    })
    if (!r.ok) throw new Error(`Supabase respondió HTTP ${r.status}`)
    const filas = await r.json().catch(() => [])
    return Array.isArray(filas) ? filas : []
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Supabase no respondió en ${esperaMs / 1000} s`)
    throw err
  } finally {
    clearTimeout(reloj)
  }
}

const idSeguro = (id) => { const n = Number(id); if (!Number.isInteger(n) || n <= 0) throw new Error('campana_id inválido'); return n }

/** La fila guardada de una campaña (o null). */
export async function leerCargoDeCampana(campanaId, opciones = {}) {
  const filas = await pedirTablaCargo(`campana_id=eq.${idSeguro(campanaId)}&select=${CAMPOS_CARGO}`, opciones)
  return filas[0] ?? null
}

/** Guarda (crea o reemplaza) la fila de una campaña y devuelve lo guardado. */
export async function guardarCargoDeCampana(fila, opciones = {}) {
  const limpia = {
    campana_id: idSeguro(fila.campana_id),
    cargo: fila.cargo ?? null,
    objetivo: fila.objetivo ?? null,
    asignado_por: fila.asignado_por ?? null,
    asignado_en: fila.asignado_en ?? null,
    objetivo_asignado_en: fila.objetivo_asignado_en ?? null,
  }
  const filas = await pedirTablaCargo('on_conflict=campana_id', { ...opciones, method: 'POST', body: [limpia], prefer: 'resolution=merge-duplicates,return=representation' })
  return filaManual(filas[0] ?? limpia)
}

/** Borra la fila de UNA campaña («Volver a lo sugerido»). Devuelve cuántas filas se borraron. */
export async function borrarCargoDeCampana(campanaId, opciones = {}) {
  const filas = await pedirTablaCargo(`campana_id=eq.${idSeguro(campanaId)}`, { ...opciones, method: 'DELETE', prefer: 'return=representation' })
  return filas.length
}

export const EVENTOS_POR_PAGINA = 1000
/** Las lecturas del resumen esperan más que el webhook: el proyecto Free puede tardar en «despertar». */
export const LECTURA_ESPERA_MS = 20_000
const MAX_PAGINAS_EVENTOS = 200

/**
 * Eventos del webhook (tabla mkt_brevo_eventos), página por página. Solo los campos que necesita el resumen.
 * Los correos se usan SOLO dentro del servidor para agrupar por destinatario; nunca salen en una respuesta.
 * @param {{campanas?: number[]|null, env?: object, fetchFn?: Function, esperaMs?: number, porPagina?: number}} [opciones]
 * @returns {Promise<Array<{campana_id: number, evento: string, correo: string, fecha_evento: string, motivo: string|null, origen: string, cantidad: number|null}>>}
 */
export async function leerEventos({ campanas = null, env = process.env, fetchFn = fetch, esperaMs = LECTURA_ESPERA_MS, porPagina = EVENTOS_POR_PAGINA } = {}) {
  const { url, llave } = configuracionMkt(env)
  const filtro = campanas?.length ? `&campana_id=in.(${campanas.map(Number).join(',')})` : ''
  const filas = []
  for (let pagina = 0; pagina < MAX_PAGINAS_EVENTOS; pagina++) {
    const control = new AbortController()
    const reloj = setTimeout(() => control.abort(), esperaMs)
    try {
      const r = await fetchFn(`${url}/rest/v1/mkt_brevo_eventos?select=campana_id,evento,correo,fecha_evento,fecha_envio,motivo,origen,cantidad,fecha_aproximada,url${filtro}&order=id.asc&limit=${porPagina}&offset=${pagina * porPagina}`, {
        headers: { apikey: llave, Accept: 'application/json' },
        signal: control.signal,
      })
      if (!r.ok) throw new Error(`Supabase respondió HTTP ${r.status}`)
      const lote = await r.json()
      if (!Array.isArray(lote)) throw new Error('Supabase devolvió un formato inesperado')
      filas.push(...lote)
      if (lote.length < porPagina) return filas
    } catch (err) {
      if (err?.name === 'AbortError') throw new Error(`Supabase no respondió en ${esperaMs / 1000} s`)
      throw err
    } finally {
      clearTimeout(reloj)
    }
  }
  throw new Error('Demasiados eventos para leer de una vez')
}

/**
 * Guarda los eventos en mkt_brevo_eventos. Si una huella ya existe, esa fila se ignora sin error
 * (Brevo puede reintentar el mismo aviso).
 * @param {Array<object>} filas  filas ya armadas por filaDeEvento (server/brevoWebhook.js)
 * @param {{env?: object, fetchFn?: Function, esperaMs?: number}} [opciones]
 * @returns {Promise<{guardados: number}>} cuántas filas nuevas se guardaron
 */
export async function guardarEventos(filas, { env = process.env, fetchFn = fetch, esperaMs = MKT_ESPERA_MS } = {}) {
  if (!filas.length) return { guardados: 0 }
  const { url, llave } = configuracionMkt(env)
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  try {
    const r = await fetchFn(`${url}/rest/v1/mkt_brevo_eventos?on_conflict=huella&select=id`, {
      method: 'POST',
      headers: {
        apikey: llave,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(filas),
      signal: control.signal,
    })
    if (!r.ok) throw new Error(`Supabase respondió HTTP ${r.status}`)
    const nuevas = await r.json().catch(() => [])
    return { guardados: Array.isArray(nuevas) ? nuevas.length : 0 }
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Supabase no respondió en ${esperaMs / 1000} s`)
    throw err
  } finally {
    clearTimeout(reloj)
  }
}
