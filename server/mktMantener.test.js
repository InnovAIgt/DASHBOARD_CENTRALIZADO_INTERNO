// Pruebas de la tarea diaria de Supabase (datos y claves inventados; no se llama a ningún servicio real).
import assert from 'node:assert/strict'
import test from 'node:test'
import { cronAutorizado, responderMantener } from './mktMantener.js'

const ENV = { CRON_SECRET: 'clave-inventada-123', MKT_SUPABASE_URL: 'https://proyecto-inventado.supabase.co', MKT_SUPABASE_SECRET_KEY: 'llave-inventada' }
const BIEN = { authorization: 'Bearer clave-inventada-123' }

test('cronAutorizado: solo con «Bearer <CRON_SECRET>» exacto; sin CRON_SECRET nunca', () => {
  assert.equal(cronAutorizado(BIEN, ENV), true)
  assert.equal(cronAutorizado({ authorization: 'Bearer otra' }, ENV), false)
  assert.equal(cronAutorizado({}, ENV), false)
  assert.equal(cronAutorizado({ authorization: 'Bearer ' }, { ...ENV, CRON_SECRET: '' }), false)
})

test('responderMantener: sin clave 401 y no llama a Supabase; con clave hace una sola lectura mínima', async () => {
  const llamadas = []
  const fetchFn = async (url, opciones) => { llamadas.push({ url, opciones }); return { ok: true, status: 200, text: async () => '[]' } }
  const sin = await responderMantener({ method: 'GET', headers: {}, env: ENV, fetchFn })
  assert.equal(sin.status, 401)
  assert.equal(llamadas.length, 0)
  const r = await responderMantener({ method: 'GET', headers: BIEN, env: ENV, fetchFn, ahora: () => new Date('2026-11-24T12:00:00Z') })
  assert.equal(r.status, 200)
  assert.deepEqual(JSON.parse(r.body), { ok: true, revisado: '2026-11-24T12:00:00.000Z' })
  assert.equal(llamadas.length, 1)
  assert.equal(llamadas[0].url, 'https://proyecto-inventado.supabase.co/rest/v1/mkt_campana_cargo?select=campana_id&limit=1')
  assert.equal(llamadas[0].opciones.method, 'GET')
  assert.ok(!r.body.includes('llave-inventada'), 'nunca devuelve la llave')
})

test('responderMantener: otros métodos 405; Supabase con error 502 sin datos', async () => {
  assert.equal((await responderMantener({ method: 'POST', headers: BIEN, env: ENV })).status, 405)
  const r = await responderMantener({ method: 'GET', headers: BIEN, env: ENV, fetchFn: async () => ({ ok: false, status: 503 }) })
  assert.equal(r.status, 502)
  const faltan = await responderMantener({ method: 'GET', headers: BIEN, env: { CRON_SECRET: ENV.CRON_SECRET } })
  assert.equal(faltan.status, 500)
})
