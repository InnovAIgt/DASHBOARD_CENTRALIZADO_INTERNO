// Pruebas del tipo de cambio por el servidor y del despachador de Flash. Datos inventados; sin red.
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { FX_VIDA_MS, responderTipoCambio, vaciarCacheTipoCambio } from './flashTipoCambio.js'
import { responderFlash, rutaFlashDe } from './ventasFlash.js'

const AHORA = Date.parse('2026-11-25T18:00:00Z')
const render = (tasa) => async () => ({ ok: true, status: 200, json: async () => ({ success: true, rate_gtq_per_usd: tasa, date: '25/11/2026', source: 'Fuente inventada', stale: false }) })
const dormido = (_url, opciones) => new Promise((_ok, falla) => opciones.signal.addEventListener('abort', () => falla(Object.assign(new Error('abortado'), { name: 'AbortError' }))))

afterEach(() => vaciarCacheTipoCambio())

test('tipo de cambio: mismo formato que Render y se guarda 6 h', async () => {
  let llamadas = 0
  const fetchFn = async (...a) => { llamadas++; return render(7.5)(...a) }
  const r = await responderTipoCambio({ fetchFn, ahora: AHORA })
  assert.equal(r.status, 200)
  const d = JSON.parse(r.body)
  assert.equal(d.rate_gtq_per_usd, 7.5)
  assert.equal(d.date, '25/11/2026')
  assert.equal(d.cached, false)
  await responderTipoCambio({ fetchFn, ahora: AHORA + FX_VIDA_MS - 1 })
  assert.equal(llamadas, 1, 'dentro de las 6 h no vuelve a pedir')
  await responderTipoCambio({ fetchFn, ahora: AHORA + FX_VIDA_MS + 1 })
  assert.equal(llamadas, 2)
})

test('tipo de cambio: si Render está dormido, responde rápido con la última tasa o «sin tasa»', async () => {
  const inicio = Date.now()
  const sin = await responderTipoCambio({ fetchFn: dormido, ahora: AHORA, esperaMs: 50 })
  assert.equal(sin.status, 503)
  assert.equal(JSON.parse(sin.body).rate_gtq_per_usd, null)
  assert.ok(Date.now() - inicio < 2000, 'corta a tiempo, no espera a Render')
  await responderTipoCambio({ fetchFn: render(7.6), ahora: AHORA })
  const vieja = await responderTipoCambio({ fetchFn: dormido, ahora: AHORA + FX_VIDA_MS + 1, esperaMs: 50 })
  assert.equal(vieja.status, 200)
  assert.equal(JSON.parse(vieja.body).rate_gtq_per_usd, 7.6)
  assert.equal(JSON.parse(vieja.body).cached, true)
})

test('despachador: ruta del rewrite (?ruta=) o de la dirección; desconocida → 404', async () => {
  assert.equal(rutaFlashDe({ url: '/api/ventas/flash?ruta=flash-altas', query: { ruta: 'flash-altas' } }), 'flash-altas')
  assert.equal(rutaFlashDe({ url: '/api/ventas/tipo-cambio?_=123' }), 'tipo-cambio')
  assert.equal((await responderFlash('otra', { method: 'GET' })).status, 404)
  assert.equal((await responderFlash('constructor', { method: 'GET' })).status, 404)
})

test('despachador: preofertas sigue igual (sin llave → 503 con los mismos encabezados)', async () => {
  const antes = process.env.WORKFLOW_API_KEY
  delete process.env.WORKFLOW_API_KEY
  const errorOriginal = console.error
  console.error = () => {}
  try {
    const r = await responderFlash('flash-preofertas', { method: 'GET' })
    assert.equal(r.status, 503)
    assert.equal(r.headers['Cache-Control'], 'no-store, max-age=0')
    assert.equal(JSON.parse(r.body).error, 'La integración de Workflow no está configurada en el servidor.')
    assert.equal((await responderFlash('flash-preofertas', { method: 'POST' })).headers.Allow, 'GET')
  } finally {
    console.error = errorOriginal
    if (antes !== undefined) process.env.WORKFLOW_API_KEY = antes
  }
})
