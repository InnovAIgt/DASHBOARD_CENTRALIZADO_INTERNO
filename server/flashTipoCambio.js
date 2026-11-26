/**
 * Ventas · Flash de altas: tipo de cambio (Q por US$) leído por el servidor del portal.
 *
 *   GET /api/ventas/tipo-cambio → mismo formato que el servicio de Render que ya usaba la página
 *   ({ success, rate_gtq_per_usd, date, source, stale, cached, fetched_at }).
 *
 * El servidor guarda la última tasa buena 6 h y SIEMPRE responde rápido: con la tasa guardada, con la nueva o, si
 * Render no contesta en 8 s y no hay tasa guardada, «sin tasa» (503). Así la página nunca corta la consulta por
 * tiempo y la pastilla de estado (estandar.js) no pasa a «Sin conexión» solo porque Render estaba dormido.
 * Documentación: docs/ventas-flash-altas/README.md
 */

export const FX_RENDER_URL = 'https://excel-parser-m9q8.onrender.com/api/tipo-cambio'
export const FX_VIDA_MS = 6 * 3600 * 1000
export const FX_ESPERA_MS = 8000
const CABECERAS = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }

let fx = null   // { datos: { rate_gtq_per_usd, date, source, stale }, t }
export function vaciarCacheTipoCambio() { fx = null }

const conTasa = (guardada) => ({
  status: 200,
  headers: { ...CABECERAS, 'Cache-Control': 'public, max-age=0, s-maxage=600' },
  body: JSON.stringify({ success: true, ...fx.datos, cached: guardada, fetched_at: new Date(fx.t).toISOString() }),
})

/** Manejador de la ruta (lo usan api/ventas/flash.js y server.ts): → { status, headers, body (texto) }. */
export async function responderTipoCambio({ method = 'GET', fetchFn = fetch, ahora = Date.now(), esperaMs = FX_ESPERA_MS } = {}) {
  if (method !== 'GET') {
    return { status: 405, headers: { ...CABECERAS, Allow: 'GET', 'Cache-Control': 'no-store' }, body: JSON.stringify({ success: false, message: 'Método no permitido. Usa GET.' }) }
  }
  if (fx && ahora - fx.t < FX_VIDA_MS) return conTasa(true)
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  try {
    const r = await fetchFn(FX_RENDER_URL, { method: 'GET', headers: { Accept: 'application/json' }, signal: control.signal })
    const d = await r.json().catch(() => null)
    const tasa = Number(d?.rate_gtq_per_usd)
    if (!r.ok || !(tasa > 0)) throw new Error(`Render respondió sin tasa (código ${r.status})`)
    fx = { datos: { rate_gtq_per_usd: tasa, date: String(d.date ?? ''), source: String(d.source ?? 'Banco de Guatemala'), stale: d.stale === true }, t: ahora }
    return conTasa(false)
  } catch (e) {
    console.warn(`[Tipo de cambio] ${e?.name === 'AbortError' ? 'Render tardó más de ' + esperaMs / 1000 + ' s' : e?.message || 'error'}${fx ? ' · se usa la tasa guardada' : ''}`)
    if (fx) return conTasa(true)
    return { status: 503, headers: { ...CABECERAS, 'Cache-Control': 'no-store' }, body: JSON.stringify({ success: false, rate_gtq_per_usd: null, message: 'Sin tasa por ahora.' }) }
  } finally {
    clearTimeout(reloj)
  }
}
