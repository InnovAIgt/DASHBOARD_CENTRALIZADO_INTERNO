// Pruebas de Flash de altas por el servidor (SAN). Datos inventados; sin red (fetch falso).
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { CAMPOS_FLASH, PAUSAS_REINTENTO_MS, mesesDesde, responderFlashAltas, vaciarCacheFlashAltas } from './flashAltasSan.js'

const ENV = { FLASH_API_KEY: 'llave-inventada', FLASH_DESDE: '2026-10' }
// 25/11/2026 12:00 en Guatemala → meses 2026-10 y 2026-11 (actual), 2 países = 4 pedidos.
const AHORA = Date.parse('2026-11-25T18:00:00Z')
const sinPausa = async () => {}

/** Fila inventada de SAN con un campo de más (imei) que no se debe publicar. */
const fila = (pais, mes, n) => ({ altcod: `${pais}${mes}${n}`, folpai: pais, fecalt: `2026-${mes}-0${n}`, vndcod: 'VEND1', anajef: 'JEFE1', clinam: `Empresa Inventada ${n}`, clicod: `CL${n}`, folcod: `${n}`, tipalt: 'ADICION', tngnam: 'LTE', nomeqp: 'Equipo X', tipeqp: 'COMODATO', cnteqp: 1, cntsim: 0, valnet: 10, cntmes: 18, imei: '000' })

/** fetch falso: por cada pedido devuelve lo que diga «responder(pais, mes, intento)». Lleva la cuenta de pedidos. */
function sanFalso(responder) {
  const pedidos = []
  const fetchFn = async (url, opciones) => {
    const u = new URL(url)
    const clave = `${u.searchParams.get('pais')}-${u.searchParams.get('mes')}`
    const intento = pedidos.filter((p) => p.clave === clave).length + 1
    pedidos.push({ clave, url: u.origin + u.pathname, llave: opciones.headers['X-API-Key'] })
    const r = await responder(u.searchParams.get('pais'), u.searchParams.get('mes'), intento)
    if (r instanceof Error) throw r
    return { ok: r.status === 200, status: r.status, json: async () => r.cuerpo }
  }
  return { fetchFn, pedidos }
}
const bien = (pais, mes, cuantas = 2) => ({ status: 200, cuerpo: { ok: true, data: Array.from({ length: cuantas }, (_, i) => fila(pais, mes, i + 1)) } })

afterEach(() => vaciarCacheFlashAltas())

test('meses desde FLASH_DESDE hasta el mes actual de Guatemala', () => {
  assert.deepEqual(mesesDesde('2026-10', AHORA).map((m) => m.clave), ['2026-10', '2026-11'])
  // 1 de diciembre 03:00 UTC = 30 de noviembre en Guatemala → todavía noviembre.
  assert.equal(mesesDesde('2026-11', Date.parse('2026-12-01T03:00:00Z')).length, 1)
  assert.equal(mesesDesde('basura', AHORA)[0].clave, '2026-01', 'valor inválido → 2026-01')
})

test('formato: { ok, actualizado, total, data } con los 16 campos, en el orden del robot (SV y luego GT)', async () => {
  const { fetchFn, pedidos } = sanFalso((pais, mes) => bien(pais, mes))
  const r = await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA })
  const cuerpo = JSON.parse(r.body)
  assert.equal(r.status, 200)
  assert.deepEqual(Object.keys(cuerpo), ['ok', 'actualizado', 'total', 'data'])
  assert.equal(cuerpo.total, 8)
  assert.equal(cuerpo.actualizado, new Date(AHORA).toISOString())
  assert.deepEqual(Object.keys(cuerpo.data[0]), CAMPOS_FLASH, 'sin imei ni otros campos')
  assert.deepEqual(cuerpo.data.map((f) => f.folpai), ['SV', 'SV', 'SV', 'SV', 'GT', 'GT', 'GT', 'GT'])
  assert.equal(pedidos[0].url, 'http://san.red.com.gt/flashApi/altas')
  assert.ok(pedidos.every((p) => p.llave === 'llave-inventada'))
  assert.match(r.headers['Cache-Control'], /s-maxage=600/)
  assert.ok(!r.body.includes('llave-inventada'), 'la llave nunca sale en la respuesta')
})

test('caché: mes actual 15 min, meses cerrados 6 h', async () => {
  const { fetchFn, pedidos } = sanFalso((pais, mes) => bien(pais, mes))
  await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA })
  assert.equal(pedidos.length, 4)
  await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA + 10 * 60000 })
  assert.equal(pedidos.length, 4, 'a los 10 min todo sale de la caché')
  await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA + 16 * 60000 })
  assert.deepEqual(pedidos.slice(4).map((p) => p.clave).sort(), ['GT-11', 'SV-11'], 'a los 16 min solo el mes actual')
  await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA + 6.1 * 3600000 })
  assert.equal(pedidos.length, 10, 'a las 6 h también los meses cerrados')
})

test('reintentos: 2 por mes (1 s y 3 s); al tercer intento llega', async () => {
  const pausas = []
  const { fetchFn, pedidos } = sanFalso((pais, mes, intento) => (pais === 'GT' && mes === '10' && intento < 3 ? new Error('red caída') : bien(pais, mes)))
  const r = await responderFlashAltas({ env: ENV, fetchFn, esperar: async (ms) => { pausas.push(ms) }, ahora: AHORA })
  assert.equal(r.status, 200)
  assert.equal(JSON.parse(r.body).total, 8)
  assert.deepEqual(pausas, PAUSAS_REINTENTO_MS)
  assert.equal(pedidos.filter((p) => p.clave === 'GT-10').length, 3)
})

test('copia buena: si falla un mes o llegan muchas menos altas, se devuelve la copia anterior con aviso', async () => {
  let modo = 'bien'
  const { fetchFn } = sanFalso((pais, mes) => {
    if (modo === 'cae' && pais === 'SV' && mes === '11') return { status: 500, cuerpo: null }
    if (modo === 'pocas') return bien(pais, mes, mes === '11' ? 0 : 1)
    return bien(pais, mes)
  })
  const primera = await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA })
  modo = 'cae'
  const r1 = await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA + 20 * 60000 })
  assert.equal(r1.status, 200)
  assert.equal(r1.body, primera.body, 'nunca datos incompletos: la misma copia de antes')
  assert.equal(r1.headers['X-Flash-Aviso'], 'copia-anterior; motivo=formato')
  modo = 'pocas'
  const r2 = await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA + 7 * 3600000 })
  assert.equal(r2.body, primera.body)
  assert.equal(r2.headers['X-Flash-Aviso'], 'copia-anterior; motivo=pocas')
})

test('sin copia buena: falta la llave → 503; llave rechazada → 502 sin reintentos; nunca la llave en el mensaje', async () => {
  const sinLlave = await responderFlashAltas({ env: {}, fetchFn: async () => { throw new Error('no debe llamar') }, ahora: AHORA })
  assert.equal(sinLlave.status, 503)
  assert.deepEqual(JSON.parse(sinLlave.body), { ok: false, message: 'Falta configurar FLASH_API_KEY en el servidor.' })
  const { fetchFn, pedidos } = sanFalso(() => ({ status: 401, cuerpo: { ok: false, message: 'No autorizado' } }))
  const rechazada = await responderFlashAltas({ env: ENV, fetchFn, esperar: sinPausa, ahora: AHORA })
  assert.equal(rechazada.status, 502)
  assert.match(JSON.parse(rechazada.body).message, /FLASH_API_KEY/)
  assert.ok(!rechazada.body.includes('llave-inventada'))
  assert.ok(pedidos.length <= 4, 'la llave rechazada no se reintenta')
  assert.equal((await responderFlashAltas({ method: 'POST', env: ENV })).status, 405)
})
