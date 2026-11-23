// Pruebas de server/mailing/campanas.js con campañas INVENTADAS. No se llama a Brevo ni a Supabase.
import assert from 'node:assert/strict'
import test from 'node:test'
import { CAMPANAS_CACHE_HTTP, CAMPANAS_CACHE_MS, filaCampana, limpiarAsunto, responderCampanas, vaciarCacheCampanas } from './campanas.js'
import { leerCargosManuales } from '../mktSupabase.js'

const ENV = { BREVO_API_KEY: 'llave-inventada' }

/** Campaña inventada con la forma de la API de Brevo (incluye campos privados que NO deben salir). */
function campana(id, extra = {}) {
  return {
    id, name: `00${id}-GG-SEGURIDAD-Asunto inventado`, subject: '{{ contact.NOMBRE }}, asunto\ninventado', type: 'classic',
    status: 'sent', sentDate: '2026-11-05T12:00:00.000-06:00', scheduledAt: null,
    sender: { name: 'Remitente', email: 'remitente@example.com' }, replyTo: 'respuesta@example.com',
    testSent: true, htmlContent: '<p>hola persona1@example.com</p>', recipients: { lists: [1] },
    statistics: { globalStats: { sent: 100, delivered: 95, softBounces: 4, hardBounces: 1, uniqueViews: 30, appleMppOpens: 6, clickers: 2, uniqueClicks: 3 } },
    ...extra,
  }
}

/** fetch falso de Brevo: responde según el estado pedido (sent / queued). */
function brevoFalso({ enviadas = [campana(1)], programadas = [], status = 200, falla = null } = {}) {
  const llamadas = []
  const fn = async (url, opciones) => {
    llamadas.push({ url, opciones })
    if (falla) throw falla
    if (status !== 200) return new Response('{"code":"x"}', { status })
    const u = new URL(url)
    const lista = u.searchParams.get('status') === 'queued' ? programadas : enviadas
    const offset = Number(u.searchParams.get('offset')), limit = Number(u.searchParams.get('limit'))
    return Response.json({ count: lista.length, campaigns: lista.slice(offset, offset + limit) })
  }
  return { fn, llamadas }
}

const sinCargos = async () => new Map()

test('limpiarAsunto: campos de Brevo como [CAMPO] y sin saltos de línea', () => {
  assert.equal(limpiarAsunto('{{ contact.NOMBRE }}Información\n para decidir '), '[NOMBRE]Información para decidir')
  assert.equal(limpiarAsunto('{{contact.empresa}} hola'), '[EMPRESA] hola')
  assert.equal(limpiarAsunto(null), '')
})

test('filaCampana: totales, tasas, semáforo, cargo y sin datos privados', () => {
  const f = filaCampana(campana(7))
  assert.equal(f.id, 7)
  assert.equal(f.asunto, '[NOMBRE], asunto inventado')
  assert.equal(f.estado, 'enviada')
  assert.deepEqual([f.codigo, f.cargoSugerido, f.cargo, f.sector, f.esPrueba], ['007', 'GG', 'GG', 'SEGURIDAD', false])
  assert.equal(f.totales.aperturas, 30)
  assert.equal(f.totales.aperturasApple, 6)
  assert.equal(f.tasas.entrega, 95)
  assert.equal(f.semaforo, 'amarillo')
  const texto = JSON.stringify(f)
  assert.ok(!texto.includes('@'), 'no debe incluir correos')
  for (const privado of ['sender', 'replyTo', 'htmlContent', 'recipients', 'testSent']) assert.ok(!(privado in f), privado)
})

test('filaCampana: el cargo elegido a mano gana; campaña de prueba; programada', () => {
  const f = filaCampana(campana(8, { name: '[PRUEBA] Webhook inventado', status: 'queued', sentDate: null, scheduledAt: '2026-12-01T09:00:00.000-06:00' }), new Map([[8, 'GO']]))
  assert.deepEqual([f.cargoSugerido, f.cargoManual, f.cargo, f.esPrueba, f.estado, f.fecha], [null, 'GO', 'GO', true, 'programada', '2026-12-01T09:00:00.000-06:00'])
  assert.equal(filaCampana(campana(9, { name: 'NOMBRE LIBRE INVENTADO' })).cargo, 'Sin clasificar')
})

test('responderCampanas: solo GET', async () => {
  vaciarCacheCampanas()
  const r = await responderCampanas({ method: 'POST', env: ENV, fetchFn: brevoFalso().fn, leerCargos: sinCargos })
  assert.equal(r.status, 405)
  assert.equal(r.headers.Allow, 'GET')
})

test('responderCampanas: enviadas y programadas, con la llave solo en el encabezado', async () => {
  vaciarCacheCampanas()
  const b = brevoFalso({ enviadas: [campana(1), campana(2)], programadas: [campana(3, { status: 'queued' })] })
  const r = await responderCampanas({ method: 'GET', env: ENV, fetchFn: b.fn, leerCargos: sinCargos })
  assert.equal(r.status, 200)
  assert.equal(r.headers['Cache-Control'], CAMPANAS_CACHE_HTTP)
  const datos = JSON.parse(r.body)
  assert.deepEqual(datos.campanas.map((c) => [c.id, c.estado]), [[3, 'programada'], [1, 'enviada'], [2, 'enviada']])
  assert.ok(!r.body.includes('@'))
  for (const { url, opciones } of b.llamadas) {
    assert.ok(!url.includes('llave-inventada'))
    assert.equal(opciones.headers['api-key'], 'llave-inventada')
    assert.match(url, /statistics=globalStats/)
  }
})

test('responderCampanas: pide varias páginas cuando hay más de 100 campañas', async () => {
  vaciarCacheCampanas()
  const muchas = Array.from({ length: 230 }, (_v, i) => campana(i + 1))
  const b = brevoFalso({ enviadas: muchas })
  const r = await responderCampanas({ method: 'GET', env: ENV, fetchFn: b.fn, leerCargos: sinCargos })
  assert.equal(JSON.parse(r.body).campanas.length, 230)
  assert.equal(b.llamadas.filter((l) => l.url.includes('status=sent')).length, 3)
})

test('responderCampanas: caché de 10 minutos', async () => {
  vaciarCacheCampanas()
  const b = brevoFalso()
  await responderCampanas({ method: 'GET', env: ENV, fetchFn: b.fn, leerCargos: sinCargos, ahora: 1_000 })
  const antes = b.llamadas.length
  await responderCampanas({ method: 'GET', env: ENV, fetchFn: b.fn, leerCargos: sinCargos, ahora: 1_000 + CAMPANAS_CACHE_MS - 1 })
  assert.equal(b.llamadas.length, antes, 'dentro de los 10 min no vuelve a llamar a Brevo')
  await responderCampanas({ method: 'GET', env: ENV, fetchFn: b.fn, leerCargos: sinCargos, ahora: 1_000 + CAMPANAS_CACHE_MS + 1 })
  assert.ok(b.llamadas.length > antes, 'después de 10 min sí vuelve a llamar')
})

test('responderCampanas: errores de Brevo sin copia guardada', async () => {
  const casos = [
    [{ status: 401 }, 502, /rechazó la llave/],
    [{ status: 429 }, 503, /esperar/],
    [{ status: 500 }, 502, /HTTP 500/],
    [{ falla: new TypeError('fetch failed') }, 502, /No se pudo conectar/],
  ]
  for (const [opciones, status, mensaje] of casos) {
    vaciarCacheCampanas()
    const r = await responderCampanas({ method: 'GET', env: ENV, fetchFn: brevoFalso(opciones).fn, leerCargos: sinCargos })
    assert.equal(r.status, status)
    assert.match(JSON.parse(r.body).error, mensaje)
    assert.equal(r.headers['Cache-Control'], 'no-store')
  }
  vaciarCacheCampanas()
  const sinLlave = await responderCampanas({ method: 'GET', env: {}, fetchFn: brevoFalso().fn, leerCargos: sinCargos })
  assert.equal(sinLlave.status, 503)
  assert.match(JSON.parse(sinLlave.body).error, /BREVO_API_KEY/)
})

test('responderCampanas: si Brevo falla y hay copia anterior, se usa con aviso', async () => {
  vaciarCacheCampanas()
  await responderCampanas({ method: 'GET', env: ENV, fetchFn: brevoFalso().fn, leerCargos: sinCargos, ahora: 0 })
  const r = await responderCampanas({ method: 'GET', env: ENV, fetchFn: brevoFalso({ status: 500 }).fn, leerCargos: sinCargos, ahora: CAMPANAS_CACHE_MS + 1 })
  assert.equal(r.status, 200)
  const datos = JSON.parse(r.body)
  assert.equal(datos.campanas.length, 1)
  assert.match(datos.avisos.at(-1), /Datos guardados de antes/)
})

test('responderCampanas: si fallan los cargos manuales, sigue con el sugerido y avisa', async () => {
  vaciarCacheCampanas()
  const r = await responderCampanas({ method: 'GET', env: ENV, fetchFn: brevoFalso().fn, leerCargos: async () => { throw new Error('Supabase respondió HTTP 503') } })
  const datos = JSON.parse(r.body)
  assert.equal(r.status, 200)
  assert.equal(datos.campanas[0].cargo, 'GG')
  assert.match(datos.avisos[0], /cargos elegidos a mano/)
})

test('leerCargosManuales: solo campana_id y cargo, con la llave en el encabezado', async () => {
  const llamadas = []
  const fetchFn = async (url, opciones) => { llamadas.push({ url, opciones }); return Response.json([{ campana_id: 5, cargo: 'GF' }]) }
  const env = { MKT_SUPABASE_URL: 'https://proyecto-inventado.supabase.co', MKT_SUPABASE_SECRET_KEY: 'llave-inventada' }
  const cargos = await leerCargosManuales({ env, fetchFn })
  assert.equal(cargos.get(5), 'GF')
  assert.equal(llamadas[0].url, 'https://proyecto-inventado.supabase.co/rest/v1/mkt_campana_cargo?select=campana_id,cargo')
  assert.equal(llamadas[0].opciones.headers.apikey, 'llave-inventada')
  await assert.rejects(leerCargosManuales({ env, fetchFn: async () => new Response('', { status: 401 }) }), /HTTP 401/)
})

test('filaCampana: del contenido HTML solo sale el objetivo encontrado, nunca el contenido', () => {
  const f = filaCampana({ id: 9, name: 'CAMPAÑA INVENTADA', subject: 'Hola', status: 'sent', htmlContent: '<p>Nuestras radios PTT para su flota</p>', statistics: { globalStats: {} } })
  assert.equal(f.objetivoContenido, 'Comunicación con radios PTT')
  assert.ok(!JSON.stringify(f).includes('radios PTT para su flota'))
  assert.equal(filaCampana({ id: 10, name: 'X', subject: 'Y', status: 'sent', statistics: { globalStats: {} } }).objetivoContenido, null)
})
