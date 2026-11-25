// Pruebas de la lectura de Prospekt (datos inventados).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ErrorProspekt, fechaCreadoUtc, leerLeadsCalificados, normalizarCorreo, normalizarTelefono, PROSPEKT_LEADS_URL, unirLeads } from './prospekt.js'

const registro = (codigo, extra = {}) => ({ codigo_prospecto: codigo, email: ' Ana.Prueba@Ejemplo.test ', telefono: '+502 5555-0101', validator_source: 'PostIAlo Mailing', pais: 'gt', fecha_creado: '2026-11-20', hora_creado: '15:30:00', asesor_nombre: '  Asesor   Inventado ', status: 'en_proceso', opportunity_stage: 3, ...extra })

test('normaliza correo y teléfono', () => {
  assert.equal(normalizarCorreo(' Ana.Prueba @Ejemplo.TEST '), 'ana.prueba@ejemplo.test')
  assert.equal(normalizarTelefono('+502 5555-0101'), '55550101')
  assert.equal(normalizarTelefono('(503) 7000 1234'), '70001234')
  assert.equal(normalizarTelefono('1234'), '')
})

test('fecha_creado y hora_creado se leen como UTC', () => {
  assert.equal(fechaCreadoUtc('2026-11-20', '15:30:00'), '2026-11-20T15:30:00.000Z')
  assert.equal(fechaCreadoUtc('2026-11-20', '9:05'), '2026-11-20T09:05:00.000Z')
  assert.equal(fechaCreadoUtc('20/11/2026', '15:30'), '2026-11-20T15:30:00.000Z')
  assert.equal(fechaCreadoUtc('2026-11-20T15:30:00Z', null), '2026-11-20T15:30:00.000Z')
  assert.equal(fechaCreadoUtc('2026-11-20T15:30:00+00:00', null), '2026-11-20T15:30:00.000Z')
  assert.equal(fechaCreadoUtc('2026-11-20', ''), '2026-11-20T00:00:00.000Z')
  assert.equal(fechaCreadoUtc('', '10:00'), null)
  assert.equal(fechaCreadoUtc('mañana', '10:00'), null)
})

test('junta leads y por_pais y quita repetidos por codigo_prospecto', () => {
  const json = {
    total: 3,
    leads: [registro('P-1'), registro('P-2'), registro('', { email: 'sin.codigo@ejemplo.test' })],
    por_pais: { GT: [registro('P-1')], SV: [registro('P-2'), registro('P-3', { pais: 'SV' })] },
  }
  const r = unirLeads(json)
  assert.equal(r.registros, 6)
  assert.equal(r.sinCodigo, 1)
  assert.deepEqual(r.leads.map((l) => l.codigo), ['P-1', 'P-2', 'P-3'])
  const l = r.leads[0]
  assert.equal(l.correo, 'ana.prueba@ejemplo.test')
  assert.equal(l.telefono, '55550101')
  assert.equal(l.pais, 'GT')
  assert.equal(l.asesor, 'Asesor Inventado')
  assert.equal(l.etapa, 3)
  assert.equal(l.fecha, '2026-11-20T15:30:00.000Z')
})

test('por_pais también puede venir como lista de grupos', () => {
  const r = unirLeads({ leads: [], por_pais: [{ pais: 'GT', leads: [registro('P-9')] }] })
  assert.deepEqual(r.leads.map((l) => l.codigo), ['P-9'])
})

const respuestaFalsa = (status, cuerpo) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => (typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo) })

test('lee con GET, límite 5000 y la llave en X-API-Key', async () => {
  let pedido
  const r = await leerLeadsCalificados({ env: { PROSPEKT_API_KEY: 'llave-falsa' }, fetchFn: async (url, op) => { pedido = { url, op }; return { ok: true, status: 200, json: async () => ({ leads: [registro('P-1')] }) } } })
  assert.equal(pedido.url, `${PROSPEKT_LEADS_URL}?limite=5000`)
  assert.equal(pedido.op.method, 'GET')
  assert.equal(pedido.op.headers['X-API-Key'], 'llave-falsa')
  assert.equal(r.leads.length, 1)
})

test('errores: sin llave, llave rechazada, caída y formato, sin mostrar la llave', async () => {
  const motivo = async (p) => { try { await leerLeadsCalificados(p); return 'sin error' } catch (e) { assert.ok(e instanceof ErrorProspekt); assert.ok(!e.message.includes('llave-falsa')); return e.motivo } }
  const env = { PROSPEKT_API_KEY: 'llave-falsa' }
  assert.equal(await motivo({ env: {} }), 'sin_llave')
  assert.equal(await motivo({ env, fetchFn: respuestaFalsa(401, {}) }), 'llave')
  assert.equal(await motivo({ env, fetchFn: respuestaFalsa(403, {}) }), 'llave')
  assert.equal(await motivo({ env, fetchFn: respuestaFalsa(500, {}) }), 'caida')
  assert.equal(await motivo({ env, fetchFn: async () => { throw new TypeError('fetch failed') } }), 'caida')
  assert.equal(await motivo({ env, fetchFn: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x') } }) }), 'formato')
  assert.equal(await motivo({ env, esperaMs: 5, fetchFn: (_u, op) => new Promise((_r, rechazar) => op.signal.addEventListener('abort', () => rechazar(Object.assign(new Error('a'), { name: 'AbortError' })))) }), 'caida')
})
