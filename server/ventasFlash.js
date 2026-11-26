/**
 * Ventas · Flash de altas: UNA sola función de Vercel para sus 3 rutas (el plan Hobby permite máximo 12 funciones).
 * vercel.json manda estas URLs a api/ventas/flash.js con ?ruta=… (rewrite); las URLs no cambian:
 *
 *   GET /api/ventas/flash-altas       → server/flashAltasSan.js (altas de SAN, FLASH_API_KEY)
 *   GET /api/ventas/flash-preofertas  → server/flashPreofertas.js (Workflow, WORKFLOW_API_KEY; igual que antes)
 *   GET /api/ventas/tipo-cambio       → server/flashTipoCambio.js (tasa de Render, guardada 6 h)
 *
 * En local, server.ts atiende las mismas rutas con responderFlash. Documentación: docs/ventas-flash-altas/README.md
 */
import { responderFlashAltas } from './flashAltasSan.js'
import { obtenerPreofertas } from './flashPreofertas.js'
import { responderTipoCambio } from './flashTipoCambio.js'

/** Preofertas con los mismos encabezados que tenía api/ventas/flash-preofertas.js. */
export async function responderPreofertas({ method = 'GET' } = {}) {
  const r = await obtenerPreofertas({ method })
  return {
    status: r.status,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...(r.status === 405 ? { Allow: 'GET' } : {}) },
    body: JSON.stringify(r.body),
  }
}

/** Las rutas y su manejador: (request) → { status, headers, body }. */
export const RUTAS_FLASH = {
  'flash-altas': (req) => responderFlashAltas({ method: req.method }),
  'flash-preofertas': (req) => responderPreofertas({ method: req.method }),
  'tipo-cambio': (req) => responderTipoCambio({ method: req.method }),
}

/** Qué ruta se pidió: el parámetro «ruta» del rewrite o, si no viene, la dirección original (/api/ventas/<ruta>). */
export function rutaFlashDe(request) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const desdeQuery = typeof request.query?.ruta === 'string' ? request.query.ruta : url.searchParams.get('ruta')
  return String(desdeQuery || url.pathname.replace(/^\/api\/ventas\/?/, '')).replace(/^\/+|\/+$/g, '')
}

/** Responde una ruta de Flash (también la usa server.ts). Ruta desconocida → 404. */
export async function responderFlash(ruta, request) {
  const manejar = Object.hasOwn(RUTAS_FLASH, ruta) ? RUTAS_FLASH[ruta] : null
  if (manejar) return manejar(request)
  return { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'Ruta de Flash desconocida' }) }
}

/** Manejador de la función de Vercel (api/ventas/flash.js). */
export async function manejarFlash(request, response) {
  const resultado = await responderFlash(rutaFlashDe(request), request)
  for (const [clave, valor] of Object.entries(resultado.headers ?? {})) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
