// Pruebas de los leads de Redes con respuestas INVENTADAS de Prospekt (nunca se llama a Prospekt).
import assert from 'node:assert/strict'
import test from 'node:test'
import { leadRedes, leadsDeRedes, responderLeadsRedes, vaciarCacheLeadsRedes } from './leads.js'

const reg = (codigo, extra = {}) => ({ codigo_prospecto: codigo, nombre_prospecto: 'Cliente Inventado', telefono: '5555-0000', email: 'no-tiene',
  validator_source: 'PostIAlo Redes Sociales', pais: 'sv', fecha_creado: '2026-11-02', hora_creado: '03:30:00', asesor_nombre: ' Asesor  Inventado ',
  status: 'en_proceso', opportunity_stage: 2, gestiones: [{ fecha_gestion: '2026-11-03', tipo: 'llamada', etapa_numero: 2, notas: 'nota inventada', display_user: 'Asesor' }], ...extra })

test('lead de Redes: fecha en UTC−6, correo solo si es correo, asesor limpio, gestiones', () => {
  const l = leadRedes(reg('A1'))
  assert.deepEqual([l.fecha, l.hora, l.pais, l.correo, l.asesor, l.etapa, l.gestiones.length], ['2026-11-01', '21:30', 'SV', '', 'Asesor Inventado', 2, 1], '03:30 UTC del 2 es el 1 a las 21:30 en UTC−6')
})

test('solo origen «PostIAlo Redes Sociales», sin repetidos y sin LDTEST', () => {
  const json = { leads: [reg('A1'), reg('A2', { validator_source: 'PostIAlo Mailing' }), reg('LDTEST-9'), reg('A3', { nombre_prospecto: 'ldtest prueba' })], por_pais: { sv: [reg('A1')] } }
  assert.deepEqual(leadsDeRedes(json).map((l) => l.codigo), ['A1'])
})

test('ruta: sin llave, con datos y total de no calificados, y nunca datos de clientes en los registros', async () => {
  vaciarCacheLeadsRedes()
  assert.equal(JSON.parse((await responderLeadsRedes({ method: 'GET', env: {} })).body).fuente, 'sin_llave')
  const fetchFn = async (url) => ({ ok: true, status: 200, json: async () => (String(url).includes('no-calificados') ? { total: 1548, items: [] } : { leads: [reg('A1'), reg('B2', { pais: 'GT' })] }) })
  const r = await responderLeadsRedes({ method: 'GET', env: { PROSPEKT_API_KEY: 'llave-inventada' }, fetchFn })
  const c = JSON.parse(r.body)
  assert.deepEqual([r.status, c.fuente, c.leads.length, c.noCalificados.total, r.headers['Cache-Control']], [200, 'prospekt', 2, 1548, 'no-store'])
  assert.ok(!r.body.includes('llave-inventada'))
  vaciarCacheLeadsRedes()
  const logs = []
  const original = console.error
  console.error = (...a) => logs.push(a.join(' '))
  try {
    const mal = await responderLeadsRedes({ method: 'GET', env: { PROSPEKT_API_KEY: 'llave-inventada' }, fetchFn: async () => ({ ok: false, status: 401, json: async () => ({}) }) })
    assert.equal(mal.status, 502)
    assert.ok(logs.every((t) => !t.includes('Cliente Inventado') && !t.includes('llave-inventada')))
  } finally { console.error = original }
  assert.equal((await responderLeadsRedes({ method: 'POST', env: {} })).status, 405)
})
