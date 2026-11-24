// Pruebas de la atribución de leads a campañas y del cruce asesor ↔ ejecutivo (datos inventados).
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { armarLeads, atribuirLead, campanasParaLeads, cruzarAsesor, etiquetaGrupo, indiceDestinatarios, responderLeads, textoIds, vaciarCacheLeads } from './leads.js'

const campana = (id, fecha, extra = {}) => ({ id, nombre: `Campaña ${id}`, estado: 'enviada', esPrueba: false, fecha, ...extra })
const CAMPANAS = [
  campana(70, '2026-10-01T16:00:00Z'),
  campana(71, '2026-11-10T16:00:00Z'),
  campana(77, '2026-11-19T15:00:00Z'),
  campana(78, '2026-11-19T15:10:00Z'),
  campana(79, '2026-11-19T15:20:00Z'),
  campana(80, '2026-11-21T15:00:00Z', { esPrueba: true }),
  campana(81, '2026-11-30T15:00:00Z', { estado: 'programada' }),
]
const ev = (campana_id, evento, correo = 'ana@ejemplo.test') => ({ campana_id, evento, correo, fecha_evento: '2026-11-19T16:00:00Z' })
const lead = (extra = {}) => ({ codigo: 'P-1', correo: 'ana@ejemplo.test', telefono: '', origen: 'PostIAlo Redes Sociales', pais: 'GT', fecha: '2026-11-20T15:00:00.000Z', asesor: 'Asesor Uno', status: 'en_proceso', etapa: 2, ...extra })

const visibles = campanasParaLeads(CAMPANAS)

test('solo campañas enviadas y no de prueba reciben leads', () => {
  assert.deepEqual(visibles.map((c) => c.id), [70, 71, 77, 78, 79])
})

test('exacta: gana la campaña con clic, luego la de apertura, luego la más reciente', () => {
  const conClic = indiceDestinatarios([ev(71, 'delivered'), ev(71, 'click'), ev(77, 'opened'), ev(79, 'delivered')])
  assert.deepEqual(atribuirLead(lead(), visibles, conClic), { tipo: 'exacta', campanas: [71], grupo: null, motivo: 'clic' })
  const conApertura = indiceDestinatarios([ev(71, 'delivered'), ev(77, 'opened'), ev(79, 'delivered')])
  assert.deepEqual(atribuirLead(lead(), visibles, conApertura), { tipo: 'exacta', campanas: [77], grupo: null, motivo: 'apertura' })
  const soloEnvio = indiceDestinatarios([ev(71, 'delivered'), ev(78, 'delivered'), ev(77, 'proxy_open')])
  assert.deepEqual(atribuirLead(lead(), visibles, soloEnvio), { tipo: 'exacta', campanas: [78], grupo: null, motivo: 'envio' })
})

test('exacta: el correo se compara sin mayúsculas ni espacios', () => {
  const d = indiceDestinatarios([ev(71, 'delivered', ' Ana@Ejemplo.TEST')])
  assert.equal(atribuirLead(lead(), visibles, d).tipo, 'exacta')
})

test('exacta: la campaña debe ser anterior al lead y de máximo 30 días', () => {
  const d = indiceDestinatarios([ev(70, 'click'), ev(77, 'click')])
  // 77 se envió después del lead del 15/11; 70 tiene más de 30 días.
  assert.equal(atribuirLead(lead({ fecha: '2026-11-15T12:00:00.000Z' }), visibles, d).tipo, 'sin_campana')
  assert.deepEqual(atribuirLead(lead({ fecha: '2026-10-31T12:00:00.000Z' }), visibles, d).campanas, [70])
})

test('exacta: una campaña de prueba no recibe el lead', () => {
  const d = indiceDestinatarios([ev(80, 'click')])
  assert.equal(atribuirLead(lead({ fecha: '2026-11-22T12:00:00.000Z' }), visibles, d).tipo, 'sin_campana')
})

test('estimada: «PostIAlo Mailing» va a la última campaña de los 7 días previos, o a su grupo del mismo día', () => {
  const sinDestinatarios = new Map()
  const mailing = lead({ correo: 'otro@ejemplo.test', origen: 'postialo  MAILING' })
  assert.deepEqual(atribuirLead(mailing, visibles, sinDestinatarios), { tipo: 'estimada', campanas: [77, 78, 79], grupo: '19 nov (77–79)', motivo: 'origen' })
  assert.deepEqual(atribuirLead({ ...mailing, fecha: '2026-11-12T12:00:00.000Z' }, visibles, sinDestinatarios), { tipo: 'estimada', campanas: [71], grupo: null, motivo: 'origen' })
  // Más de 7 días desde la última → sin campaña. La de prueba (80) no cuenta.
  assert.equal(atribuirLead({ ...mailing, fecha: '2026-11-28T12:00:00.000Z' }, visibles, sinDestinatarios).tipo, 'sin_campana')
  // Si el lead llegó entre la 77 y la 78, solo cuenta la 77.
  assert.deepEqual(atribuirLead({ ...mailing, fecha: '2026-11-19T15:05:00.000Z' }, visibles, sinDestinatarios).campanas, [77])
})

test('otros orígenes sin coincidencia exacta, o sin fecha, quedan sin campaña', () => {
  assert.equal(atribuirLead(lead({ correo: 'otro@ejemplo.test' }), visibles, new Map()).tipo, 'sin_campana')
  assert.equal(atribuirLead(lead({ fecha: null }), visibles, indiceDestinatarios([ev(71, 'click')])).tipo, 'sin_campana')
})

test('textos de grupo', () => {
  assert.equal(textoIds([79, 77, 78]), '77–79')
  assert.equal(textoIds([71, 74]), '71, 74')
  assert.equal(textoIds([71, 72]), '71, 72')
  // 19/11 a las 01:00 UTC todavía es 18/11 en Guatemala.
  assert.equal(etiquetaGrupo(Date.parse('2026-11-19T01:00:00Z'), [1, 2]), '18 nov (1, 2)')
})

test('cruce de asesor: sin tildes, mayúsculas ni espacios; otro orden; nombre corto como posible', () => {
  const ejecutivos = ['José Pérez López', 'MARÍA  José Gómez', 'Ana Ruiz', 'Ana Ruiz Castillo']
  assert.deepEqual(cruzarAsesor('jose perez lopez', ejecutivos), { ejecutivo: 'José Pérez López', cruce: 'exacta' })
  assert.deepEqual(cruzarAsesor('Gómez María José', ejecutivos), { ejecutivo: 'MARÍA  José Gómez', cruce: 'exacta' })
  assert.deepEqual(cruzarAsesor('José Pérez', ejecutivos), { ejecutivo: 'José Pérez López', cruce: 'posible' })
  assert.deepEqual(cruzarAsesor('Ana Ruiz', ejecutivos), { ejecutivo: 'Ana Ruiz', cruce: 'exacta' })
  // «José» solo no basta (una palabra), y «Ruiz Castillo» está en un solo ejecutivo.
  assert.deepEqual(cruzarAsesor('José', ejecutivos), { ejecutivo: null, cruce: 'sin_cruce' })
  assert.deepEqual(cruzarAsesor('Ruiz Castillo', ejecutivos), { ejecutivo: 'Ana Ruiz Castillo', cruce: 'posible' })
  assert.deepEqual(cruzarAsesor('Pedro Inventado', ejecutivos), { ejecutivo: null, cruce: 'sin_cruce' })
  assert.deepEqual(cruzarAsesor('', ejecutivos), { ejecutivo: null, cruce: 'sin_cruce' })
})

test('armarLeads no devuelve correo ni teléfono y cuenta por tipo y cerrados', () => {
  const { filas, resumen } = armarLeads({
    leads: [lead(), lead({ codigo: 'P-2', correo: 'b@ejemplo.test', origen: 'PostIAlo Mailing', etapa: 6, telefono: '55550101' }), lead({ codigo: 'P-3', correo: 'c@ejemplo.test' })],
    campanas: CAMPANAS,
    eventos: [ev(77, 'click')],
    ejecutivos: ['Asesor Uno'],
  })
  for (const f of filas) { assert.ok(!('correo' in f)); assert.ok(!('telefono' in f)) }
  assert.ok(!JSON.stringify(filas).includes('@'))
  assert.deepEqual(resumen, { total: 3, exactas: 1, estimadas: 1, sinCampana: 1, cerrados: 1, conCorreo: 3, sinFecha: 0 })
  assert.equal(filas[0].tieneCorreo, true)
  assert.equal(filas[0].ejecutivo, 'Asesor Uno')
  assert.equal(filas[0].cruceEjecutivo, 'exacta')
})

// ---------- Ruta ----------

const deps = (extra = {}) => ({
  method: 'GET', env: {},
  leerProspekt: async () => ({ leads: [lead()], registros: 2, sinCodigo: 0 }),
  leerCampanas: async () => CAMPANAS,
  leer: async () => [ev(77, 'click')],
  cartera: async () => [{ ejecutivo: 'Asesor Uno', pais: 'GT', clientes: 3 }],
  ...extra,
})
const cuerpo = (r) => JSON.parse(r.body)

beforeEach(() => vaciarCacheLeads())

test('ruta: responde los leads, sin guardar copia en el navegador', async () => {
  const r = await responderLeads(deps())
  assert.equal(r.status, 200)
  assert.equal(r.headers['Cache-Control'], 'no-store')
  const d = cuerpo(r)
  assert.equal(d.fuente, 'prospekt')
  assert.equal(d.resumen.exactas, 1)
  assert.equal(d.resumen.registros, 2)
  assert.deepEqual(d.avisos, [])
})

test('ruta: solo GET', async () => {
  assert.equal((await responderLeads(deps({ method: 'POST' }))).status, 405)
})

test('ruta: sin llave responde 200 con fuente «sin_llave» y la pantalla sigue', async () => {
  const r = await responderLeads(deps({ leerProspekt: async () => { throw Object.assign(new Error('x'), { motivo: 'sin_llave' }) } }))
  assert.equal(r.status, 200)
  assert.equal(cuerpo(r).fuente, 'sin_llave')
  assert.deepEqual(cuerpo(r).filas, [])
})

test('ruta: llave rechazada o caída sin copia anterior → 502 con motivo', async () => {
  for (const motivo of ['llave', 'caida', 'formato']) {
    vaciarCacheLeads()
    const r = await responderLeads(deps({ leerProspekt: async () => { throw Object.assign(new Error('x'), { motivo }) } }))
    assert.equal(r.status, 502)
    assert.equal(cuerpo(r).fuente, 'error')
    assert.equal(cuerpo(r).motivo, motivo)
  }
})

test('ruta: si Prospekt se cae y hay una lectura anterior, la usa y avisa', async () => {
  await responderLeads(deps({ ahora: 0 }))
  const r = await responderLeads(deps({ ahora: 15 * 60 * 1000, leerProspekt: async () => { throw Object.assign(new Error('x'), { motivo: 'caida' }) } }))
  const d = cuerpo(r)
  assert.equal(r.status, 200)
  assert.equal(d.copiaDe, new Date(0).toISOString())
  assert.match(d.avisos[0], /hace 15 min/)
  assert.equal(d.filas.length, 1)
})

test('ruta: la copia dura 10 minutos', async () => {
  let lecturas = 0
  const leerProspekt = async () => { lecturas++; return { leads: [lead()], registros: 1, sinCodigo: 0 } }
  await responderLeads(deps({ ahora: 0, leerProspekt }))
  await responderLeads(deps({ ahora: 9 * 60 * 1000, leerProspekt }))
  assert.equal(lecturas, 1)
  await responderLeads(deps({ ahora: 11 * 60 * 1000, leerProspekt }))
  assert.equal(lecturas, 2)
})

test('ruta: si fallan Brevo, Supabase o Cumplimiento, sigue con avisos', async () => {
  const falla = async () => { throw new Error('caído') }
  const d = cuerpo(await responderLeads(deps({ leerCampanas: falla, leer: falla, cartera: falla })))
  assert.equal(d.fuente, 'prospekt')
  assert.equal(d.avisos.length, 3)
  assert.equal(d.resumen.sinCampana, 1)
  assert.equal(d.filas[0].cruceEjecutivo, 'sin_cruce')
})
