/**
 * Ventas · Flash de altas: las altas de SAN leídas por el servidor del portal (solo lectura, GET).
 *
 *   GET /api/ventas/flash-altas → { ok, actualizado, total, data }
 *
 * Mismo formato y mismos 16 campos que el datos.json del robot (repo InnovAIgt/Dashboard---flash-altas, actualizar.js),
 * para que flash-altas.html no cambie. SAN: GET {FLASH_API_SERVIDOR}/flashApi/altas?pais=&anio=&mes= con la llave
 * FLASH_API_KEY en el encabezado X-API-Key (solo servidor, sin VITE_). Un pedido por país y mes desde FLASH_DESDE.
 *
 * Caché en memoria por mes: meses cerrados 6 h, mes actual 15 min. Cada mes tiene 2 reintentos (1 s y 3 s).
 * Protecciones del robot: si falla un solo mes o llegan muchas menos altas que la última vez (menos del 90 %), NO se
 * devuelven datos incompletos: se devuelve la última copia buena (encabezado X-Flash-Aviso). Sin copia buena, error.
 * Nunca se escriben la llave ni datos de clientes en los registros ni en los mensajes.
 * Documentación: docs/ventas-flash-altas/README.md
 */

export const SAN_POR_DEFECTO = 'http://san.red.com.gt'
export const DESDE_POR_DEFECTO = '2026-01'
/** Mismo orden que el robot: primero todos los meses de SV, luego los de GT. */
export const PAISES_FLASH = ['SV', 'GT']
/** Los 16 campos que publica el robot (no IMEI ni otros datos técnicos). */
export const CAMPOS_FLASH = ['altcod', 'folpai', 'fecalt', 'vndcod', 'anajef', 'clinam', 'clicod', 'folcod', 'tipalt', 'tngnam', 'nomeqp', 'tipeqp', 'cnteqp', 'cntsim', 'valnet', 'cntmes']
export const CACHE_CERRADO_MS = 6 * 3600 * 1000
export const CACHE_ACTUAL_MS = 15 * 60 * 1000
export const CDN_SEGUNDOS = 600
export const PAUSAS_REINTENTO_MS = [1000, 3000]
const ESPERA_INTENTO_MS = 15_000
const PRESUPUESTO_MS = 45_000   // la función de Vercel tiene 60 s
const EN_PARALELO = 4
const MINIMO_RELATIVO = 0.9
const MS_GT = 6 * 3600 * 1000
const CABECERAS = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }

/** Error con un motivo fijo y un mensaje sin datos privados. motivo: sin_llave · llave · caida · formato · pocas. */
export class ErrorSan extends Error {
  constructor(motivo, mensaje) { super(mensaje); this.motivo = motivo }
}

let meses = new Map()   // «SV|2026-11» → { filas, t }
let copiaBuena = null   // última respuesta completa { ok, actualizado, total, data }
let enCurso = null      // un solo pedido a SAN a la vez por instancia
export function vaciarCacheFlashAltas() { meses = new Map(); copiaBuena = null; enCurso = null }

/** Mes actual (AAAA-MM) en hora de Guatemala. */
export const mesActualGt = (ahora) => new Date(ahora - MS_GT).toISOString().slice(0, 7)

/** Meses desde «AAAA-MM» hasta el mes actual de Guatemala: [{ anio, mes, clave: 'AAAA-MM' }]. */
export function mesesDesde(desde, ahora) {
  const m = String(desde ?? '').trim().match(/^(\d{4})-(\d{1,2})$/) ?? DESDE_POR_DEFECTO.match(/^(\d{4})-(\d{1,2})$/)
  const [aFin, mFin] = mesActualGt(ahora).split('-').map(Number)
  const lista = []
  for (let a = Number(m[1]), mes = Number(m[2]); a < aFin || (a === aFin && mes <= mFin); mes === 12 ? (a++, mes = 1) : mes++) {
    lista.push({ anio: a, mes, clave: `${a}-${String(mes).padStart(2, '0')}` })
  }
  return lista
}

/** Una fila de SAN → solo los 16 campos (lo que falte va en null). */
export const filaFlash = (r) => Object.fromEntries(CAMPOS_FLASH.map((c) => [c, r?.[c] ?? null]))

const nuncaEspera = (ms) => new Promise((resolver) => setTimeout(resolver, ms))

/** Un país y un mes de SAN, con 2 reintentos. La llave rechazada no se reintenta. */
async function pedirMes({ servidor, llave, pais, anio, mes, fetchFn, esperar, limite }) {
  const url = `${servidor}/flashApi/altas?${new URLSearchParams({ pais, anio: String(anio), mes: String(mes) })}`
  const nombre = `${pais} ${anio}-${String(mes).padStart(2, '0')}`
  let ultimo = null
  for (let intento = 0; intento <= PAUSAS_REINTENTO_MS.length; intento++) {
    if (intento) await esperar(PAUSAS_REINTENTO_MS[intento - 1])
    const queda = limite - Date.now()
    if (queda <= 0) throw new ErrorSan('caida', `SAN tardó demasiado (${nombre}).`)
    const control = new AbortController()
    const reloj = setTimeout(() => control.abort(), Math.min(ESPERA_INTENTO_MS, queda))
    try {
      const r = await fetchFn(url, { method: 'GET', headers: { 'X-API-Key': llave, Accept: 'application/json' }, signal: control.signal })
      const json = await r.json().catch(() => null)
      if (r.status === 401 || r.status === 403 || (json?.ok === false && /autoriz/i.test(String(json.message ?? '')))) {
        throw new ErrorSan('llave', 'SAN rechazó la llave (revisar FLASH_API_KEY).')
      }
      if (r.ok && json?.ok === true && Array.isArray(json.data)) return json.data.map(filaFlash)
      ultimo = new ErrorSan('formato', `SAN no devolvió ${nombre} (código ${r.status}).`)
    } catch (e) {
      if (e instanceof ErrorSan && e.motivo === 'llave') throw e
      ultimo = e instanceof ErrorSan ? e : new ErrorSan('caida', `Sin respuesta de SAN (${nombre}).`)
    } finally {
      clearTimeout(reloj)
    }
  }
  throw ultimo
}

/**
 * Las altas completas (de la caché por mes y lo que falte, de SAN). Lanza ErrorSan si falta la llave, si falla
 * algún mes o si llegan muchas menos altas que la última copia buena. Solo guarda en caché si TODO salió bien.
 */
export async function leerAltasSan({ env = process.env, fetchFn = fetch, esperar = nuncaEspera, ahora = Date.now() } = {}) {
  const llave = String(env?.FLASH_API_KEY ?? '').trim()
  if (!llave) throw new ErrorSan('sin_llave', 'Falta configurar FLASH_API_KEY en el servidor.')
  const servidor = (String(env?.FLASH_API_SERVIDOR ?? '').trim() || SAN_POR_DEFECTO).replace(/\/+$/, '')
  const actual = mesActualGt(ahora)
  const lista = mesesDesde(env?.FLASH_DESDE, ahora)
  const tareas = PAISES_FLASH.flatMap((pais) => lista.map((m) => ({ pais, ...m, k: `${pais}|${m.clave}`, esActual: m.clave === actual })))
  const vigente = (t) => { const c = meses.get(t.k); return c && ahora - c.t < (t.esActual ? CACHE_ACTUAL_MS : CACHE_CERRADO_MS) }
  const pendientes = tareas.filter((t) => !vigente(t))

  const limite = Date.now() + PRESUPUESTO_MS
  const nuevos = new Map()
  for (let i = 0; i < pendientes.length; i += EN_PARALELO) {
    const partes = await Promise.all(pendientes.slice(i, i + EN_PARALELO).map(async (t) => [t.k, await pedirMes({ servidor, llave, ...t, fetchFn, esperar, limite })]))
    for (const [k, filas] of partes) nuevos.set(k, { filas, t: ahora })
  }

  const data = tareas.flatMap((t) => (nuevos.get(t.k) ?? meses.get(t.k)).filas)
  if (!data.length) throw new ErrorSan('formato', 'SAN devolvió 0 altas.')
  if (copiaBuena && data.length < copiaBuena.total * MINIMO_RELATIVO) {
    throw new ErrorSan('pocas', `Llegaron ${data.length} altas y antes había ${copiaBuena.total}.`)
  }
  for (const [k, v] of nuevos) meses.set(k, v)
  // «actualizado» = cuándo se pidió a SAN el mes actual (lo más nuevo que puede cambiar).
  const tActual = Math.min(...tareas.filter((t) => t.esActual).map((t) => meses.get(t.k).t))
  copiaBuena = { ok: true, actualizado: new Date(tActual).toISOString(), total: data.length, data }
  return copiaBuena
}

/** Manejador de la ruta (lo usan api/ventas/flash.js y server.ts): → { status, headers, body (texto) }. */
export async function responderFlashAltas({ method = 'GET', env = process.env, fetchFn = fetch, esperar = nuncaEspera, ahora = Date.now() } = {}) {
  if (method !== 'GET') {
    return { status: 405, headers: { ...CABECERAS, Allow: 'GET', 'Cache-Control': 'no-store' }, body: JSON.stringify({ ok: false, message: 'Método no permitido. Usa GET.' }) }
  }
  try {
    enCurso ??= leerAltasSan({ env, fetchFn, esperar, ahora }).finally(() => { enCurso = null })
    const datos = await enCurso
    return { status: 200, headers: { ...CABECERAS, 'Cache-Control': `public, max-age=0, s-maxage=${CDN_SEGUNDOS}` }, body: JSON.stringify(datos) }
  } catch (e) {
    const error = e instanceof ErrorSan ? e : new ErrorSan('caida', 'No se pudieron leer las altas de SAN.')
    console.warn(`[Flash altas] ${error.motivo}: ${error.message}${copiaBuena ? ' · se devuelve la copia anterior' : ''}`)
    if (copiaBuena) {
      return { status: 200, headers: { ...CABECERAS, 'Cache-Control': 'public, max-age=0, s-maxage=60', 'X-Flash-Aviso': `copia-anterior; motivo=${error.motivo}` }, body: JSON.stringify(copiaBuena) }
    }
    return { status: error.motivo === 'sin_llave' ? 503 : 502, headers: { ...CABECERAS, 'Cache-Control': 'no-store' }, body: JSON.stringify({ ok: false, message: error.message }) }
  }
}
