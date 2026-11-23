// Pruebas de «Por comercial» (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { metricasPorEjecutivo, SIN_IDENTIFICAR, textoPaises } from './porEjecutivo.js'

const ana = { pais: 'SV', codigo: '1', cliente: 'Empresa A', ejecutivo: 'Ana Ejemplo' }
const bruno = { pais: 'GT', codigo: '2', cliente: 'Empresa B', ejecutivo: 'Bruno Ficticio' }
const fila = (correo, campana_id, estado, extra = {}) => ({ correo, campana_id, estado, apertura: 'NO REGISTRADA', clic: 'SIN CLIC REGISTRADO', status: 'MANTENER', clientes: [ana], posibles: [], ...extra })
const FILAS = [
  fila('a1@example.com', 74, 'entregado', { apertura: 'APERTURA REGISTRADA', clic: 'CLIC REGISTRADO' }),
  fila('a2@example.com', 74, 'entregado'),
  fila('a3@example.com', 75, 'rebote_permanente', { status: 'CORREGIR' }),
  fila('a3@example.com', 76, 'rebote_permanente', { status: 'CORREGIR' }),
  fila('b1@example.com', 74, 'entregado', { clientes: [bruno] }),
  fila('posible@example.com', 74, 'entregado', { clientes: [], posibles: [bruno] }),
  fila('nadie@example.com', 74, 'rebote_temporal', { clientes: [] }),
]

test('metricasPorEjecutivo: cifras por ejecutivo con coincidencia exacta; posibles y sin base a «Sin identificar»', () => {
  const r = Object.fromEntries(metricasPorEjecutivo(FILAS, [{ ejecutivo: 'Ana Ejemplo', pais: 'SV', clientes: 45 }, { ejecutivo: 'Ana Ejemplo', pais: 'GT', clientes: 0 }]).map((x) => [x.ejecutivo, x]))
  const a = r['Ana Ejemplo']
  assert.deepEqual(a.totales, { enviados: 4, entregados: 2, aperturas: 1, clics: 1, rebotes: 2, casosCorregir: 2, corregir: 1 })
  assert.equal(a.tasas.entrega, 50)
  assert.equal(a.tasas.apertura, 50)
  assert.equal(a.cartera, 45)
  assert.equal(textoPaises(a.paises), 'El Salvador', 'el país sale de la cartera (solo donde tiene clientes)')
  assert.deepEqual(a.campanas, [76, 75, 74])
  assert.equal(r['Bruno Ficticio'].totales.enviados, 1, 'el posible por dominio no cuenta para Bruno')
  assert.equal(r['Bruno Ficticio'].cartera, 0, 'con carteras leídas y sin filas propias, la cartera es 0')
  const s = r[SIN_IDENTIFICAR]
  assert.equal(s.totales.enviados, 2)
  assert.equal(s.cartera, null)
  assert.equal(s.sinIdentificar, true)
})

test('metricasPorEjecutivo: sin cartera leída, cartera = null y el país sale de los envíos', () => {
  const a = metricasPorEjecutivo(FILAS, null).find((x) => x.ejecutivo === 'Ana Ejemplo')
  assert.equal(a.cartera, null)
  assert.equal(a.clientesAlcanzados, 1)
  assert.equal(textoPaises(new Set(['SV', 'GT'])), 'GT y SV')
})

test('detalleCartera: interesados (clic o 2+ aperturas), no reciben, nunca abren y sus campañas', async () => {
  const { detalleCartera } = await import('./porEjecutivo.js')
  const c1 = { pais: 'SV', codigo: '1', cliente: 'Empresa Uno', ejecutivo: 'Ana Ejemplo' }
  const c2 = { pais: 'SV', codigo: '2', cliente: 'Empresa Dos', ejecutivo: 'Ana Ejemplo' }
  const c3 = { pais: 'SV', codigo: '3', cliente: 'Empresa Tres', ejecutivo: 'Ana Ejemplo' }
  const c4 = { pais: 'SV', codigo: '4', cliente: 'Empresa Cuatro', ejecutivo: 'Ana Ejemplo' }
  const f = (correo, campana_id, cli, extra = {}) => ({ correo, campana_id, estado: 'entregado', apertura: 'NO REGISTRADA', clic: 'SIN CLIC REGISTRADO', status: 'MANTENER', clientes: [cli], ...extra })
  const filas = [
    f('u@uno.example.com', 74, c1, { clic: 'CLIC REGISTRADO', apertura: 'APERTURA REGISTRADA' }),
    f('d@dos.example.com', 74, c2, { apertura: 'APERTURA REGISTRADA' }),
    f('d@dos.example.com', 75, c2, { apertura: 'APERTURA REGISTRADA' }),
    f('t@tres.example.com', 74, c3, { estado: 'rebote_permanente', status: 'CORREGIR', motivoTecnico: 'Cuenta inexistente' }),
    f('c@cuatro.example.com', 74, c4),
    f('c@cuatro.example.com', 75, c4),
  ]
  const e = metricasPorEjecutivo(filas, null).find((x) => x.ejecutivo === 'Ana Ejemplo')
  const d = detalleCartera(e)
  assert.deepEqual(d.interesados.map((x) => [x.nombre, x.motivo]), [['Empresa Uno', 'clic'], ['Empresa Dos', 'aperturas']])
  assert.equal(d.interesados[0].campanaId, 74)
  assert.deepEqual(d.noReciben, [{ nombre: 'Empresa Tres', motivo: 'Cuenta inexistente', correos: 1 }])
  assert.deepEqual(d.nuncaAbren, [{ nombre: 'Empresa Cuatro', de: 2 }])
  assert.deepEqual(d.campanas.map((x) => [x.id, x.enviados, x.entrega]), [[75, 2, 100], [74, 4, 75]])
})
