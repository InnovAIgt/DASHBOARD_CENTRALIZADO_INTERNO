/**
 * Canales de marketing: UNA sola función de Vercel para todas las rutas de Mailing, Redes, el webhook de Brevo y la tarea
 * diaria de Supabase (el plan Hobby permite máximo 12 funciones). Reparte según la ruta y usa los MISMOS manejadores de
 * server/ que ya existían; las URLs no cambian:
 *
 *   POST /api/marketing/brevo-webhook            → server/brevoWebhook.js (misma autenticación)
 *   GET  /api/marketing/mantener-supabase        → server/mktMantener.js (cron de vercel.json, CRON_SECRET)
 *   GET  /api/marketing/mailing/{campanas,resumen,detalle,leads}
 *   POST/DELETE /api/marketing/mailing/cargo
 *   GET  /api/marketing/redes/{cuentas,publicaciones,programadas,anuncios,anuncios-detalle,anio,leads}
 *
 * vercel.json manda esas URLs a api/marketing/canales.js con ?ruta=… (rewrite). /api/marketing/reuniones (Flujo de
 * ventas) NO pasa por aquí: sigue en su propia función.
 */
import { procesarWebhookBrevo } from './brevoWebhook.js'
import { responderCampanas } from './mailing/campanas.js'
import { responderCargo } from './mailing/cargoEditar.js'
import { responderDetalle } from './mailing/detalle.js'
import { responderLeads } from './mailing/leads.js'
import { responderResumen } from './mailing/resumen.js'
import { responderMantener } from './mktMantener.js'
import { responderLeadsRedes } from './redes/leads.js'
import { responderRedes } from './redes/rutas.js'

const RECURSOS_REDES = ['cuentas', 'publicaciones', 'programadas', 'anuncios', 'anuncios-detalle', 'anio']

/** Las rutas y su manejador: (request, query) → { status, headers, body }. */
export const RUTAS_CANALES = {
  'brevo-webhook': (req) => procesarWebhookBrevo({ method: req.method, headers: req.headers, body: req.body }),
  'mantener-supabase': (req) => responderMantener({ method: req.method, headers: req.headers }),
  'mailing/campanas': (req) => responderCampanas({ method: req.method }),
  'mailing/resumen': (req, q) => responderResumen({ method: req.method, query: { campanas: q.get('campanas') ?? '' } }),
  'mailing/detalle': (req, q) => responderDetalle({ method: req.method, query: { campanas: q.get('campanas') ?? '' } }),
  'mailing/leads': (req) => responderLeads({ method: req.method }),
  'mailing/cargo': (req) => {
    const ip = String(req.headers?.['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'desconocida').split(',')[0].trim()
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    return responderCargo({ method: req.method, body: body ?? {}, ip })
  },
  'redes/leads': (req) => responderLeadsRedes({ method: req.method }),
  ...Object.fromEntries(RECURSOS_REDES.map((r) => [`redes/${r}`, (req, q) => responderRedes({ recurso: r, method: req.method, query: { mes: q.get('mes') ?? '' } })])),
}

/**
 * Qué ruta pidió el navegador: el parámetro «ruta» que agrega el rewrite de vercel.json o, si no viene, la dirección
 * original (/api/marketing/<ruta>). Devuelve también los demás parámetros (sin «ruta»).
 */
export function rutaDe(request) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const desdeQuery = typeof request.query?.ruta === 'string' ? request.query.ruta : Array.isArray(request.query?.ruta) ? request.query.ruta.join('/') : url.searchParams.get('ruta')
  const desdePath = url.pathname.replace(/^\/api\/marketing\/?/, '')
  const ruta = String(desdeQuery || desdePath).replace(/^\/+|\/+$/g, '')
  const q = new URLSearchParams(url.search)
  // Vercel también da los parámetros ya leídos en request.query: se usan si la dirección no los trae.
  for (const [k, v] of Object.entries(request.query ?? {})) if (!q.has(k) && typeof v === 'string') q.set(k, v)
  q.delete('ruta')
  return { ruta, q }
}

/** Manejador de la función de Vercel (api/marketing/canales.js). */
export async function manejarCanales(request, response) {
  const { ruta, q } = rutaDe(request)
  const manejar = RUTAS_CANALES[ruta]
  const resultado = manejar
    ? await manejar(request, q)
    : { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'Ruta de marketing desconocida' }) }
  for (const [clave, valor] of Object.entries(resultado.headers ?? {})) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
