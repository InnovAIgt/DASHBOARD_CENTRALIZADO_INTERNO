/**
 * Servicio al Cliente · datos de SAC por nuestro servidor (solo lectura).
 *
 * Las Edge Functions de SAC (proyecto de Supabase de SAC KPIs) rechazan con 403 a los
 * navegadores que llegan desde el dominio del portal (CORS), por eso el dashboard mostraba
 * «sac-corte-publico no disponible (Failed to fetch)». Desde el servidor no hay CORS:
 * el portal pide /api/sac/... a su propio dominio y aquí se reenvía la consulta.
 *
 *   /api/sac/corte     → sac-corte-publico      (variable SAC_CORTE_URL)
 *   /api/sac/vivo      → sac-vivo-publico       (variable SAC_VIVO_URL)
 *   /api/sac/historico → sac-historico-semanal  (variable SAC_HIST_URL)
 *
 * Las variables son SOLO de servidor (sin VITE_) y opcionales: si no existen se usa la
 * dirección actual. Solo GET; se reenvían los parámetros de la consulta tal cual, y no se
 * reenvía ningún encabezado del navegador (ni Origin ni cookies).
 * La usan api/sac/*.js (Vercel) y server.ts (local / Docker).
 */

export const SAC_FUENTES = {
  corte: {
    variable: 'SAC_CORTE_URL',
    porDefecto: 'https://erjmqjcjggxbktxcogkm.supabase.co/functions/v1/sac-corte-publico',
    nombre: 'sac-corte-publico',
  },
  vivo: {
    variable: 'SAC_VIVO_URL',
    porDefecto: 'https://erjmqjcjggxbktxcogkm.supabase.co/functions/v1/sac-vivo-publico',
    nombre: 'sac-vivo-publico',
  },
  historico: {
    variable: 'SAC_HIST_URL',
    porDefecto: 'https://erjmqjcjggxbktxcogkm.supabase.co/functions/v1/sac-historico-semanal',
    nombre: 'sac-historico-semanal',
  },
}

/** Cuánto puede guardar la respuesta el navegador o la CDN de Vercel (solo las respuestas 200). */
export const SAC_CACHE_OK = 'public, max-age=60, s-maxage=60'
/** Las funciones tardan ~12 s; el HTML espera hasta 45 s (corte). Se corta un poco después. */
export const SAC_ESPERA_MS = 50_000

/** Dirección de la función: la variable de servidor si es https válida; si no, la de siempre. */
export function urlFuente(fuente, env = process.env) {
  const f = SAC_FUENTES[fuente]
  const valor = String(env?.[f.variable] ?? '').trim()
  if (!valor) return f.porDefecto
  try {
    const url = new URL(valor)
    if (url.protocol === 'https:') return url.href
  } catch { /* se usa la dirección de siempre */ }
  console.warn(`[SAC] ${f.variable} no es una dirección https válida; se usa la dirección por defecto.`)
  return f.porDefecto
}

/**
 * Reenvía una consulta GET a la función de SAC.
 * @param {{fuente: string, method: string, query?: string, env?: object, fetchFn?: Function, esperaMs?: number}} p
 *   query: lo que va después de «?» en la petición del navegador (sin el «?»).
 * @returns {Promise<{status: number, headers: Record<string,string>, body: string}>}
 */
export async function reenviarSac({ fuente, method, query = '', env = process.env, fetchFn = fetch, esperaMs = SAC_ESPERA_MS }) {
  const f = SAC_FUENTES[fuente]
  if (!f) return respuestaError(404, 'Fuente de SAC desconocida.')
  if (method !== 'GET') return { ...respuestaError(405, 'Método no permitido. Usa GET.'), headers: { ...sinCache(), Allow: 'GET' } }

  const destino = new URL(urlFuente(fuente, env))
  const parametros = new URLSearchParams(String(query || '').replace(/^\?/, ''))
  for (const [clave, valor] of parametros) destino.searchParams.append(clave, valor)

  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  try {
    const r = await fetchFn(destino.href, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: control.signal,
    })
    const body = await r.text()
    return {
      status: r.status,
      headers: {
        'Content-Type': r.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': r.status === 200 ? SAC_CACHE_OK : 'no-store',
      },
      body,
    }
  } catch (err) {
    const tiempo = err?.name === 'AbortError'
    console.warn(`[SAC] ${f.nombre}:`, tiempo ? `no respondió en ${esperaMs / 1000} s` : err?.message || err)
    return tiempo
      ? respuestaError(504, `${f.nombre} no respondió a tiempo.`)
      : respuestaError(502, `No se pudo conectar con ${f.nombre}.`)
  } finally {
    clearTimeout(reloj)
  }
}

function sinCache() {
  return { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
}

function respuestaError(status, error) {
  return { status, headers: sinCache(), body: JSON.stringify({ error }) }
}
