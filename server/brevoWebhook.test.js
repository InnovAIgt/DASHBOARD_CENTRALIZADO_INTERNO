// Pruebas de server/brevoWebhook.js y server/mktSupabase.js con datos INVENTADOS.
// No se llama a Brevo ni a Supabase: el guardado y fetch son simulados. Correos de example.com (dominio reservado).
import assert from 'node:assert/strict'
import test from 'node:test'
import { claveCorrecta, claveRecibida, ENLACE_DE_BAJA, esEnlaceBaja, filaDeEvento, huellaDe, limpiarUrl, procesarWebhookBrevo, WEBHOOK_MAX_BYTES } from './brevoWebhook.js'
import { configuracionMkt, guardarEventos } from './mktSupabase.js'

const CLAVE = 'clave-inventada-para-pruebas-0123456789'
const ENV = { BREVO_WEBHOOK_SECRET: CLAVE }
const CON_CLAVE = { 'x-webhook-token': CLAVE }

/** Evento inventado con la forma de la documentación de Brevo (marketing webhooks). */
function evento(extra = {}) {
  return {
    id: 999, event: 'delivered', email: 'persona1@example.com', camp_id: 101, campaign_name: 'Campaña inventada',
    date_sent: '2026-11-20 10:00:00', date_event: '2026-11-20 10:00:05', ts_sent: 1795680000, ts_event: 1795680005,
    ts: 1795680005, tag: '', sending_ip: '192.0.2.10', segment_ids: [1], ...extra,
  }
}

/** Guardado simulado: recuerda las filas y responde cuántas guardó (o falla). */
function guardadoFalso({ falla = null, guardados = null } = {}) {
  const llamadas = []
  const fn = async (filas, opciones) => {
    llamadas.push({ filas, opciones })
    if (falla) throw falla
    return { guardados: guardados ?? filas.length }
  }
  return { fn, llamadas }
}

const procesar = (p) => procesarWebhookBrevo({ method: 'POST', headers: CON_CLAVE, env: ENV, ...p })

test('solo acepta POST', async () => {
  const g = guardadoFalso()
  const r = await procesarWebhookBrevo({ method: 'GET', headers: CON_CLAVE, env: ENV, guardar: g.fn })
  assert.equal(r.status, 405)
  assert.equal(r.headers.Allow, 'POST')
  assert.equal(g.llamadas.length, 0)
})

test('sin clave o con clave incorrecta: 401 y no guarda nada', async () => {
  for (const headers of [{}, { 'x-webhook-token': 'otra-clave' }, { authorization: 'Bearer ' + CLAVE }]) {
    const g = guardadoFalso()
    const r = await procesar({ headers, body: evento(), guardar: g.fn })
    assert.equal(r.status, 401)
    assert.equal(g.llamadas.length, 0)
    assert.ok(!r.body.includes(CLAVE))
  }
})

test('acepta la clave en el encabezado x-webhook-token o como usuario:clave (Basic auth)', async () => {
  const basic = 'Basic ' + Buffer.from('brevo:' + CLAVE).toString('base64')
  for (const headers of [CON_CLAVE, { authorization: basic }]) {
    const g = guardadoFalso()
    const r = await procesar({ headers, body: evento(), guardar: g.fn })
    assert.equal(r.status, 200)
    assert.equal(g.llamadas.length, 1)
  }
  assert.equal(claveRecibida({ authorization: 'Basic ' + Buffer.from('solo-usuario').toString('base64') }), '')
  assert.equal(claveCorrecta('', CLAVE), false)
  assert.equal(claveCorrecta(CLAVE, ''), false)
})

test('si falta BREVO_WEBHOOK_SECRET en el servidor: 429 para que Brevo reintente', async () => {
  const g = guardadoFalso()
  const r = await procesar({ env: {}, body: evento(), guardar: g.fn })
  assert.equal(r.status, 429)
  assert.equal(r.headers['Retry-After'], '600')
  assert.equal(g.llamadas.length, 0)
})

test('contenido inválido: 400; demasiado grande: 413', async () => {
  for (const body of [undefined, null, 'no es json', 42]) {
    const r = await procesar({ body, guardar: guardadoFalso().fn })
    assert.equal(r.status, 400, `body ${String(body)}`)
  }
  const grande = await procesar({ headers: { ...CON_CLAVE, 'content-length': String(WEBHOOK_MAX_BYTES + 1) }, body: evento(), guardar: guardadoFalso().fn })
  assert.equal(grande.status, 413)
})

test('un evento suelto, como texto JSON o ya leído', async () => {
  for (const body of [evento(), JSON.stringify(evento())]) {
    const g = guardadoFalso()
    const r = await procesar({ body, guardar: g.fn })
    assert.equal(r.status, 200)
    assert.deepEqual(JSON.parse(r.body), { recibidos: 1, guardados: 1, ignorados: 0 })
  }
})

test('una lista de eventos (lote) y duplicados dentro del mismo lote', async () => {
  const g = guardadoFalso()
  const lote = [evento(), evento(), evento({ event: 'opened', ts_event: 1795680100 }), evento({ email: 'persona2@example.com' })]
  const r = await procesar({ body: lote, guardar: g.fn })
  assert.equal(r.status, 200)
  assert.equal(g.llamadas[0].filas.length, 3)
  assert.deepEqual(JSON.parse(r.body), { recibidos: 4, guardados: 3, ignorados: 1 })
})

test('un aviso repetido (reintento de Brevo) tiene la misma huella y Supabase lo ignora', async () => {
  const a = filaDeEvento(evento())
  const b = filaDeEvento(evento())
  assert.equal(a.huella, b.huella)
  assert.match(a.huella, /^[0-9a-f]{64}$/)
  assert.ok(!a.huella.includes('example.com'))
  const g = guardadoFalso({ guardados: 0 })
  const r = await procesar({ body: evento(), guardar: g.fn })
  assert.deepEqual(JSON.parse(r.body), { recibidos: 1, guardados: 0, ignorados: 1 })
})

test('un evento con nombre desconocido se guarda igual (se filtra después)', async () => {
  const fila = filaDeEvento(evento({ event: 'Evento_Nuevo' }))
  assert.equal(fila.evento, 'evento_nuevo')
})

test('los eventos de contactos (sin campaña) y los incompletos se ignoran', async () => {
  const contacto = { event: 'contact_updated', key: 'x', content: ['NOMBRE'], email: 'persona3@example.com', ts_event: 1795680005 }
  assert.equal(filaDeEvento(contacto), null)
  assert.equal(filaDeEvento(evento({ email: 'sin-arroba' })), null)
  assert.equal(filaDeEvento(evento({ camp_id: 'abc' })), null)
  assert.equal(filaDeEvento(evento({ ts_event: undefined, ts: undefined })), null)
  assert.equal(filaDeEvento(evento({ event: '' })), null)
  const g = guardadoFalso()
  const r = await procesar({ body: [contacto], guardar: g.fn })
  assert.equal(r.status, 200)
  assert.equal(g.llamadas.length, 0)
  assert.deepEqual(JSON.parse(r.body), { recibidos: 1, guardados: 0, ignorados: 1 })
})

test('normaliza el correo y las fechas, y guarda el motivo del rebote', () => {
  const fila = filaDeEvento(evento({ event: 'soft_bounce', email: '  Persona1@EXAMPLE.com ', reason: ' buzón lleno (inventado) ' }))
  assert.equal(fila.correo, 'persona1@example.com')
  assert.equal(fila.evento, 'soft_bounce')
  assert.equal(fila.motivo, 'buzón lleno (inventado)')
  assert.equal(fila.fecha_evento, new Date(1795680005 * 1000).toISOString())
  assert.equal(fila.fecha_envio, new Date(1795680000 * 1000).toISOString())
  assert.equal(filaDeEvento(evento()).motivo, null)
  assert.equal(filaDeEvento(evento({ ts_event: 1795680005000 })).fecha_evento, fila.fecha_evento)
})

test('guarda el destino del clic LIMPIO; nunca IP, segmentos ni listas', () => {
  const fila = filaDeEvento(evento({ event: 'click', URL: 'https://example.com/promo/radios?utm_source=brevo&email=persona1@example.com#arriba' }))
  assert.deepEqual(Object.keys(fila).sort(), ['campana_id', 'correo', 'evento', 'fecha_envio', 'fecha_evento', 'huella', 'motivo', 'url'])
  assert.equal(fila.url, 'https://example.com/promo/radios', 'sin lo que va después de ? ni #')
  assert.equal(filaDeEvento(evento({ event: 'opened' })).url, null, 'solo los clics llevan url')
  assert.equal(filaDeEvento(evento({ event: 'click' })).url, null, 'clic sin URL')
})

test('limpiarUrl y enlaces de baja', () => {
  assert.equal(limpiarUrl('https://www.example.com/'), 'https://www.example.com')
  assert.equal(limpiarUrl('http://example.com/a/b?x=1'), 'http://example.com/a/b')
  for (const u of ['https://example.com/unsubscribe?token=abc', 'https://r.example.com/optout/123', 'https://example.com/darse-de-baja', 'https://example.com/es/baja'])
    assert.equal(limpiarUrl(u), ENLACE_DE_BAJA, u)
  assert.equal(esEnlaceBaja('https://example.com/bajada-de-precios'), false)
  for (const malo of ['', null, 'no es url', 'javascript:alert(1)', 'mailto:persona1@example.com']) assert.equal(limpiarUrl(malo), null, String(malo))
})

test('la URL del clic no cambia la huella (un reintento sigue siendo el mismo evento)', () => {
  const a = filaDeEvento(evento({ event: 'click', URL: 'https://example.com/a' }))
  const b = filaDeEvento(evento({ event: 'click', URL: 'https://example.com/a?otra=cosa' }))
  assert.equal(a.huella, b.huella)
})

test('si Supabase falla: 429 y la respuesta no trae correos', async () => {
  const g = guardadoFalso({ falla: new Error('Supabase respondió HTTP 503') })
  const r = await procesar({ body: evento(), guardar: g.fn })
  assert.equal(r.status, 429)
  assert.ok(!r.body.includes('@'))
})

test('ninguna respuesta incluye correos ni la clave', async () => {
  const r = await procesar({ body: [evento(), evento({ email: 'persona2@example.com' })], guardar: guardadoFalso().fn })
  assert.ok(!r.body.includes('@'))
  assert.ok(!r.body.includes(CLAVE))
  assert.equal(r.headers['Cache-Control'], 'no-store')
})

test('huellaDe cambia si cambia cualquiera de los 4 datos', () => {
  const base = { evento: 'opened', campana_id: 1, correo: 'persona1@example.com', fecha_evento: '2026-11-20T10:00:00.000Z' }
  const h = huellaDe(base)
  for (const cambio of [{ evento: 'click' }, { campana_id: 2 }, { correo: 'persona2@example.com' }, { fecha_evento: '2026-11-20T10:00:01.000Z' }]) {
    assert.notEqual(huellaDe({ ...base, ...cambio }), h)
  }
})

// --- server/mktSupabase.js (fetch simulado) ---

const ENV_MKT = { MKT_SUPABASE_URL: 'https://proyecto-inventado.supabase.co/', MKT_SUPABASE_SECRET_KEY: 'llave-inventada' }

test('configuracionMkt pide las 2 variables y una dirección https', () => {
  assert.throws(() => configuracionMkt({}), /faltan las variables/)
  assert.throws(() => configuracionMkt({ ...ENV_MKT, MKT_SUPABASE_URL: 'http://inseguro.test' }), /https/)
  assert.throws(() => configuracionMkt({ ...ENV_MKT, MKT_SUPABASE_URL: 'no es url' }), /no es una dirección/)
  assert.equal(configuracionMkt(ENV_MKT).url, 'https://proyecto-inventado.supabase.co')
})

test('guardarEventos manda las filas a mkt_brevo_eventos ignorando huellas repetidas', async () => {
  const llamadas = []
  const fetchFn = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return new Response(JSON.stringify([{ id: 1 }]), { status: 201, headers: { 'content-type': 'application/json' } })
  }
  const filas = [filaDeEvento(evento()), filaDeEvento(evento({ email: 'persona2@example.com' }))]
  const r = await guardarEventos(filas, { env: ENV_MKT, fetchFn })
  assert.deepEqual(r, { guardados: 1 })
  const { url, opciones } = llamadas[0]
  assert.equal(url, 'https://proyecto-inventado.supabase.co/rest/v1/mkt_brevo_eventos?on_conflict=huella&select=id')
  assert.equal(opciones.method, 'POST')
  assert.equal(opciones.headers.apikey, 'llave-inventada')
  assert.match(opciones.headers.Prefer, /resolution=ignore-duplicates/)
  assert.equal(JSON.parse(opciones.body).length, 2)
})

test('guardarEventos: error de Supabase o sin respuesta → error sin datos personales', async () => {
  const filas = [filaDeEvento(evento())]
  const mal = async () => new Response('{"message":"x"}', { status: 503 })
  await assert.rejects(guardarEventos(filas, { env: ENV_MKT, fetchFn: mal }), (e) => /HTTP 503/.test(e.message) && !e.message.includes('@'))
  const lento = (_url, { signal }) => new Promise((_ok, falla) => signal.addEventListener('abort', () => falla(Object.assign(new Error('abortado'), { name: 'AbortError' }))))
  await assert.rejects(guardarEventos(filas, { env: ENV_MKT, fetchFn: lento, esperaMs: 20 }), /no respondió/)
  await assert.rejects(guardarEventos(filas, { env: {} }), /faltan las variables/)
  assert.deepEqual(await guardarEventos([], { env: {} }), { guardados: 0 })
})
