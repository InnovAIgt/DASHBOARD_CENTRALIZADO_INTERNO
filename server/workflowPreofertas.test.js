// Pruebas de la ruta de preofertas de Workflow (sin red: Workflow se simula).
import assert from 'node:assert/strict'
import test from 'node:test'
import { obtenerPreofertas, WORKFLOW_PREOFERTAS_URL } from './workflowPreofertas.js'

const respuestaFalsa = (status, cuerpo) => async () => new Response(cuerpo, { status, headers: { 'content-type': 'application/json' } })

test('sin WORKFLOW_API_KEY: mensaje claro, sin detalles técnicos', async () => {
  const r = await obtenerPreofertas({ env: {} })
  assert.equal(r.status, 503)
  const cuerpo = JSON.parse(r.body)
  assert.equal(cuerpo.message, 'No se pudieron cargar las preofertas.')
  assert.equal(cuerpo.ok, false)
})

test('con la llave: reenvía la respuesta de Workflow TAL CUAL y la llave va solo en los encabezados', async () => {
  const original = JSON.stringify({ data: [{ preOferta: 'PO-1', estado: 'en_proceso', cantidad: 3 }], meta: { generadoEn: '2026-11-18T10:00:00Z' } })
  let pedido = null
  const r = await obtenerPreofertas({
    env: { WORKFLOW_API_KEY: 'llave-de-prueba' },
    fetchFn: async (url, opciones) => { pedido = { url, opciones }; return new Response(original, { status: 200, headers: { 'content-type': 'application/json' } }) },
  })
  assert.equal(r.status, 200)
  assert.equal(r.body, original)
  assert.equal(pedido.url, WORKFLOW_PREOFERTAS_URL)
  assert.equal(pedido.opciones.headers['X-API-KEY'], 'llave-de-prueba')
  assert.ok(!r.body.includes('llave-de-prueba'))
})

test('Workflow responde error o no hay conexión: el mismo mensaje claro', async () => {
  const conError = await obtenerPreofertas({ env: { WORKFLOW_API_KEY: 'x' }, fetchFn: respuestaFalsa(500, 'Internal Server Error') })
  assert.equal(conError.status, 502)
  assert.equal(JSON.parse(conError.body).message, 'No se pudieron cargar las preofertas.')
  const sinRed = await obtenerPreofertas({ env: { WORKFLOW_API_KEY: 'x' }, fetchFn: async () => { throw new TypeError('fetch failed') } })
  assert.equal(sinRed.status, 502)
  assert.equal(JSON.parse(sinRed.body).message, 'No se pudieron cargar las preofertas.')
})

test('solo acepta GET', async () => {
  assert.equal((await obtenerPreofertas({ method: 'POST', env: { WORKFLOW_API_KEY: 'x' } })).status, 405)
})
