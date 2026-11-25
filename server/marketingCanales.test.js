// Pruebas de la función única de Canales de marketing (sin llamar a servicios externos: sin variables de entorno).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { manejarCanales, RUTAS_CANALES, rutaDe } from './marketingCanales.js'

// Las URLs que existían como funciones separadas: deben seguir existiendo exactamente igual.
const RUTAS_DE_ANTES = ['brevo-webhook', 'mantener-supabase', 'mailing/campanas', 'mailing/cargo', 'mailing/detalle', 'mailing/leads', 'mailing/resumen',
  'redes/anuncios', 'redes/anuncios-detalle', 'redes/cuentas', 'redes/leads', 'redes/programadas', 'redes/publicaciones']

/** Respuesta de Vercel inventada: guarda lo que se le manda. */
function respuesta() {
  const r = { estado: null, cabeceras: {}, cuerpo: null }
  return { r, res: { setHeader: (k, v) => { r.cabeceras[k] = v }, status(s) { r.estado = s; return this }, send(b) { r.cuerpo = b; return this } } }
}

test('todas las rutas de antes tienen su manejador; reuniones (Flujo de ventas) no pasa por aquí', () => {
  assert.deepEqual(Object.keys(RUTAS_CANALES).sort(), [...RUTAS_DE_ANTES].sort())
  assert.equal(RUTAS_CANALES.reuniones, undefined)
})

test('la ruta y los parámetros se leen igual con el rewrite (?ruta=), con la dirección original y con request.query de Vercel', () => {
  const a = rutaDe({ url: '/api/marketing/canales?ruta=redes/cuentas&mes=2026-11' })
  const b = rutaDe({ url: '/api/marketing/redes/cuentas?mes=2026-11' })
  const c = rutaDe({ url: '/api/marketing/canales', query: { ruta: 'redes/cuentas', mes: '2026-11' } })
  for (const x of [a, b, c]) assert.deepEqual([x.ruta, x.q.get('mes'), x.q.has('ruta')], ['redes/cuentas', '2026-11', false])
  assert.equal(rutaDe({ url: '/api/marketing/mailing/resumen?campanas=1,2' }).q.get('campanas'), '1,2')
})

test('cada ruta responde lo mismo que su manejador directo (mismo estado y cuerpo)', async () => {
  const casos = [
    ['mailing/campanas', 'GET'], ['mailing/leads', 'GET'], ['redes/leads', 'GET'], ['redes/cuentas', 'GET'], ['redes/anuncios-detalle', 'GET'],
    ['mantener-supabase', 'GET'], ['brevo-webhook', 'POST'], ['mailing/cargo', 'POST'], ['mailing/resumen', 'POST'],
  ]
  for (const [ruta, method] of casos) {
    const req = { url: `/api/marketing/canales?ruta=${ruta}&mes=2026-11`, method, headers: {}, body: {} }
    const directo = await RUTAS_CANALES[ruta](req, new URLSearchParams('mes=2026-11'))
    const { r, res } = respuesta()
    await manejarCanales(req, res)
    assert.equal(r.estado, directo.status, ruta)
    assert.equal(r.cuerpo, directo.body, ruta)
  }
  const { r, res } = respuesta()
  await manejarCanales({ url: '/api/marketing/canales?ruta=nada', method: 'GET', headers: {} }, res)
  assert.equal(r.estado, 404)
})

test('vercel.json: el rewrite manda cada ruta (y el cron) a la función única, no toca reuniones, y hay 12 funciones o menos', () => {
  const raiz = path.resolve(import.meta.dirname, '..')
  const vercel = JSON.parse(fs.readFileSync(path.join(raiz, 'vercel.json'), 'utf8'))
  const regla = vercel.rewrites.find((r) => r.destination.startsWith('/api/marketing/canales'))
  assert.ok(regla, 'falta el rewrite a la función única')
  assert.ok(vercel.rewrites.indexOf(regla) < vercel.rewrites.findIndex((r) => r.source === '/api/(.*)'), 'el rewrite va antes del general de /api')
  const re = new RegExp(`^${regla.source.replace(/\//g, '\\/')}$`)
  for (const ruta of RUTAS_DE_ANTES) assert.ok(re.test(`/api/marketing/${ruta}`), ruta)
  assert.ok(!re.test('/api/marketing/reuniones') && !re.test('/api/marketing/canales'))
  assert.ok(vercel.crons.every((c) => re.test(c.path)), 'el cron llega a la función única')
  const funciones = []
  const recorrer = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) recorrer(p); else if (/\.(js|ts|mjs)$/.test(e.name) && !e.name.startsWith('_')) funciones.push(p) } }
  recorrer(path.join(raiz, 'api'))
  assert.ok(funciones.length <= 12, `hay ${funciones.length} funciones`)
  for (const patron of Object.keys(vercel.functions)) {
    const re2 = new RegExp(`^${patron.replace(/\./g, '\\.').replace(/\*/g, '[^/]+')}$`)
    assert.ok(funciones.some((f) => re2.test(path.relative(raiz, f).replace(/\\/g, '/'))), `el patrón ${patron} de vercel.json no encuentra ninguna función`)
  }
})
