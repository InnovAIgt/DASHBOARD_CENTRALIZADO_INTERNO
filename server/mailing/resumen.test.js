// Pruebas de server/mailing/resumen.js con eventos INVENTADOS (correos de example.com). No se llama a Supabase.
import assert from 'node:assert/strict'
import test from 'node:test'
import { leerParametroCampanas, responderResumen, resumirCampana, RESUMEN_CACHE_HTTP, RESUMEN_CACHE_MS, vaciarCacheResumen } from './resumen.js'
import { leerEventos } from '../mktSupabase.js'

const ev = (campana_id, correo, evento, fecha, motivo = null) => ({ campana_id, correo, evento, fecha_evento: fecha, motivo })

/** Eventos inventados de 2 campañas. */
const EVENTOS = [
  // campaña 10: 5 destinatarios
  ev(10, 'persona1@example.com', 'delivered', '2026-11-24T10:00:00Z'),
  ev(10, 'persona1@example.com', 'opened', '2026-11-24T10:05:00Z'),
  ev(10, 'persona1@example.com', 'click', '2026-11-24T10:06:00Z'),
  ev(10, 'persona2@example.com', 'hard_bounce', '2026-11-24T10:00:01Z', '550 5.1.1 user unknown (inventado)'),
  ev(10, 'persona3@example.com', 'delivered', '2026-11-24T10:00:00Z'),
  ev(10, 'persona3@example.com', 'soft_bounce', '2026-11-24T11:00:00Z', 'Mailbox full (inventado)'),
  ev(10, 'persona4@example.com', 'delivered', '2026-11-24T10:00:00Z'),
  ev(10, 'persona4@example.com', 'hard_bounce', '2026-11-24T10:00:00Z', 'empate inventado'),
  ev(10, 'persona5@example.com', 'proxy_open', '2026-11-24T10:30:00Z'),
  ev(10, 'persona5@example.com', 'evento_nuevo', '2026-11-24T10:31:00Z'),
  // campaña 11: 2 destinatarios
  ev(11, 'persona1@example.com', 'delivered', '2026-11-25T09:00:00Z'),
  ev(11, 'persona1@example.com', 'unsubscribe', '2026-11-25T09:10:00Z'),
  ev(11, 'persona6@example.com', 'hard_bounce', '2026-11-25T09:00:00Z', 'algo raro inventado'),
  ev(11, 'persona6@example.com', 'spam', '2026-11-25T09:20:00Z'),
]

const leerFalso = (eventos = EVENTOS, falla = null) => {
  const llamadas = []
  const fn = async (opciones) => {
    llamadas.push(opciones)
    if (falla) throw falla
    return opciones.campanas ? eventos.filter((e) => opciones.campanas.includes(e.campana_id)) : eventos
  }
  return { fn, llamadas }
}

test('leerParametroCampanas: lista de números, vacío = todas, inválido = 400', () => {
  assert.equal(leerParametroCampanas(''), null)
  assert.equal(leerParametroCampanas(undefined), null)
  assert.deepEqual(leerParametroCampanas(' 13, 12,12 '), [12, 13])
  for (const malo of ['abc', '1,x', '-3', '0', '1;2', '1.5']) assert.throws(() => leerParametroCampanas(malo), /números/, malo)
  assert.throws(() => leerParametroCampanas(Array.from({ length: 201 }, (_v, i) => i + 1).join(',')), /Máximo/)
})

test('resumirCampana: estados finales, empate, CORREGIR/MANTENER, apertura, clic y otros eventos', () => {
  const r = resumirCampana(EVENTOS.filter((e) => e.campana_id === 10))
  assert.equal(r.eventos, 10)
  assert.equal(r.destinatarios, 5)
  assert.deepEqual(r.estados, { entregado: 1, rebote_temporal: 1, rebote_permanente: 1, sin_confirmacion: 2 })
  assert.equal(r.empates, 1)
  assert.equal(r.sinEventosDeEntrega, 1)
  assert.deepEqual(r.status, { CORREGIR: 1, MANTENER: 4 })
  assert.deepEqual(r.motivosCorregir, { 'Cuenta destinataria inexistente': 1 })
  assert.deepEqual(r.motivosMantener, { 'Buzón lleno': 1 })
  assert.equal(r.aperturaRegistrada, 1)
  assert.equal(r.proxyOpen, 1)
  assert.equal(r.clic, 1)
  assert.deepEqual(r.otrosEventos, { evento_nuevo: 1 })
  assert.equal(r.primerEvento, '2026-11-24T10:00:00.000Z')
  assert.equal(r.ultimoEvento, '2026-11-24T11:00:00.000Z')
})

test('resumirCampana: rebote permanente sin causa reconocida → CORREGIR (regla 4); spam y bajas', () => {
  const r = resumirCampana(EVENTOS.filter((e) => e.campana_id === 11))
  assert.deepEqual(r.status, { CORREGIR: 1, MANTENER: 1 })
  assert.deepEqual(r.motivosCorregir, { 'Rechazo sin causa específica': 1 })
  assert.equal(r.spam, 1)
  assert.equal(r.bajas, 1)
})

test('historial importado: apertura automática (Apple MPP sin apertura con fecha) y origen de los eventos', () => {
  const h = (correo, evento, fecha, extra = {}) => ({ ...ev(20, correo, evento, fecha), origen: 'historial', ...extra })
  const r = resumirCampana([
    h('persona1@example.com', 'delivered', '2026-11-05T18:21:19Z'),
    h('persona1@example.com', 'apple_mpp', '2026-11-05T18:21:19Z', { cantidad: 2 }), // solo automática
    h('persona2@example.com', 'delivered', '2026-11-05T18:21:19Z'),
    h('persona2@example.com', 'opened', '2026-11-05T19:00:00Z', { cantidad: 3 }),
    h('persona2@example.com', 'apple_mpp', '2026-11-05T19:00:00Z', { cantidad: 1 }), // con fecha: gana REGISTRADA
    { ...ev(20, 'persona3@example.com', 'opened', '2026-11-24T10:00:00Z'), origen: 'webhook' },
  ])
  assert.equal(r.aperturaRegistrada, 2)
  assert.equal(r.aperturaAutomatica, 1)
  assert.deepEqual(r.origen, { historial: 5, webhook: 1 })
  assert.deepEqual(r.otrosEventos, {}, 'apple_mpp es un evento conocido')
  assert.equal(r.estados.entregado, 2, 'apple_mpp no cambia el estado final')
})

test('responderResumen: con la tabla vacía responde «sin datos»', async () => {
  vaciarCacheResumen()
  const r = await responderResumen({ method: 'GET', leer: leerFalso([]).fn })
  assert.equal(r.status, 200)
  const d = JSON.parse(r.body)
  assert.equal(d.hayDatos, false)
  assert.equal(d.mensaje, 'Sin datos del webhook todavía.')
  assert.deepEqual(d.campanas, {})
})

test('responderResumen: todas las campañas, o solo las pedidas; nunca correos', async () => {
  vaciarCacheResumen()
  const l = leerFalso()
  const todas = await responderResumen({ method: 'GET', leer: l.fn })
  const d = JSON.parse(todas.body)
  assert.equal(todas.headers['Cache-Control'], RESUMEN_CACHE_HTTP)
  assert.equal(d.hayDatos, true)
  assert.deepEqual(Object.keys(d.campanas), ['10', '11'])
  assert.ok(!todas.body.includes('@'), 'la respuesta no debe tener correos')
  assert.ok(!todas.body.includes('example.com'))
  const una = await responderResumen({ method: 'GET', query: { campanas: '11' }, leer: l.fn })
  assert.deepEqual(Object.keys(JSON.parse(una.body).campanas), ['11'])
  assert.deepEqual(l.llamadas.at(-1).campanas, [11])
})

test('responderResumen: solo GET y parámetro inválido', async () => {
  vaciarCacheResumen()
  const post = await responderResumen({ method: 'POST', leer: leerFalso().fn })
  assert.equal(post.status, 405)
  assert.equal(post.headers.Allow, 'GET')
  const malo = await responderResumen({ method: 'GET', query: { campanas: 'abc' }, leer: leerFalso().fn })
  assert.equal(malo.status, 400)
})

test('responderResumen: caché de 2 minutos por consulta', async () => {
  vaciarCacheResumen()
  const l = leerFalso()
  await responderResumen({ method: 'GET', query: { campanas: '10' }, leer: l.fn, ahora: 0 })
  await responderResumen({ method: 'GET', query: { campanas: '10' }, leer: l.fn, ahora: RESUMEN_CACHE_MS - 1 })
  assert.equal(l.llamadas.length, 1)
  await responderResumen({ method: 'GET', query: { campanas: '11' }, leer: l.fn, ahora: 10 })
  assert.equal(l.llamadas.length, 2, 'otra consulta no usa la misma copia')
  await responderResumen({ method: 'GET', query: { campanas: '10' }, leer: l.fn, ahora: RESUMEN_CACHE_MS + 1 })
  assert.equal(l.llamadas.length, 3)
})

test('responderResumen: errores de Supabase, y copia anterior con aviso', async () => {
  const casos = [
    [new Error('faltan las variables MKT_SUPABASE_URL o MKT_SUPABASE_SECRET_KEY'), 503, /Falta configurar/],
    [new Error('Supabase no respondió en 8 s'), 504, /a tiempo/],
    [new Error('Supabase respondió HTTP 401'), 502, /No se pudieron leer/],
  ]
  for (const [falla, status, mensaje] of casos) {
    vaciarCacheResumen()
    const r = await responderResumen({ method: 'GET', leer: leerFalso(EVENTOS, falla).fn })
    assert.equal(r.status, status)
    assert.match(JSON.parse(r.body).error, mensaje)
  }
  vaciarCacheResumen()
  await responderResumen({ method: 'GET', leer: leerFalso().fn, ahora: 0 })
  const r = await responderResumen({ method: 'GET', leer: leerFalso(EVENTOS, new Error('Supabase respondió HTTP 500')).fn, ahora: RESUMEN_CACHE_MS + 1 })
  assert.equal(r.status, 200)
  assert.match(JSON.parse(r.body).avisos.at(-1), /Datos guardados de antes/)
})

test('leerEventos: pide página por página, filtra por campaña y no pide columnas de más', async () => {
  const env = { MKT_SUPABASE_URL: 'https://proyecto-inventado.supabase.co', MKT_SUPABASE_SECRET_KEY: 'llave-inventada' }
  const urls = []
  const filas = EVENTOS.slice(0, 5)
  const fetchFn = async (url) => {
    urls.push(url)
    const offset = Number(new URL(url).searchParams.get('offset'))
    return Response.json(filas.slice(offset, offset + 2))
  }
  const r = await leerEventos({ campanas: [10, 11], env, fetchFn, porPagina: 2 })
  assert.equal(r.length, 5)
  assert.equal(urls.length, 3)
  const u = new URL(urls[0])
  assert.equal(u.searchParams.get('select'), 'campana_id,evento,correo,fecha_evento,motivo,origen,cantidad')
  assert.equal(u.searchParams.get('campana_id'), 'in.(10,11)')
  await assert.rejects(leerEventos({ env, fetchFn: async () => new Response('', { status: 500 }) }), /HTTP 500/)
  await assert.rejects(leerEventos({ env: {} }), /faltan las variables/)
})
