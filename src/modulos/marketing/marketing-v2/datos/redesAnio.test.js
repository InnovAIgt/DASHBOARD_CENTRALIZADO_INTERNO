// Pruebas del «Año» de Resumen y del filtro de meses (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { anioPorMes, totalesAnio } from './redesAnio.js'
import { mesActualGt, mesAnteriorDe, mesesDisponibles } from './redes.js'

const anio = {
  meses: ['2026-01', '2026-02'],
  filas: [
    { mes: '2026-01', marca: 'gt', pais: 'GT', red: 'fb', publicaciones: 4, alcance: 100 },
    { mes: '2026-01', marca: 'sv', pais: 'SV', red: 'ig', publicaciones: 2, alcance: 50 },
    { mes: '2026-02', marca: 'sv', pais: 'SV', red: 'fb', publicaciones: 3, alcance: 70 },
  ],
  anuncios: [
    { mes: '2026-01', marca: 'sv', pais: 'SV', moneda: 'USD', gastado: 10.5, mensajes: 6 },
    { mes: '2026-02', marca: 'sv', pais: 'SV', moneda: 'USD', gastado: 20, mensajes: 9 },
    { mes: '2026-02', marca: 'sv', pais: 'SV', moneda: 'USD', gastado: 99, mensajes: 1, reclutamiento: true },
  ],
}
const leads = [{ fecha: '2026-01-05', pais: 'GT' }, { fecha: '2026-02-07', pais: 'SV' }, { fecha: '2026-02-09', pais: 'SV' }]

test('año: por mes, sin reclutamiento, con filtros de país, marca y red', () => {
  const r = anioPorMes(anio, leads)
  assert.deepEqual(r.meses.map((m) => [m.mes, m.publicaciones, m.alcance, m.inversion, m.mensajes, m.leads]), [['2026-01', 6, 150, 10.5, 6, 1], ['2026-02', 3, 70, 20, 9, 2]])
  assert.deepEqual(totalesAnio(r.meses), { publicaciones: 9, alcance: 220, inversion: 30.5, mensajes: 15, leads: 3 })
  const sv = anioPorMes(anio, leads, { pais: 'SV', red: 'fb' })
  assert.deepEqual(sv.meses.map((m) => [m.publicaciones, m.leads]), [[0, 0], [3, 2]])
  assert.equal(anioPorMes(anio, leads, { marca: 'sv' }).leadsPorPais, true, 'en SV los leads no tienen marca: se avisa')
  assert.deepEqual(anioPorMes(null).meses, [])
})

test('meses del filtro: de enero 2026 al actual, el más reciente primero; mes anterior de enero es diciembre', () => {
  assert.deepEqual(mesesDisponibles('2026-03'), ['2026-03', '2026-02', '2026-01'])
  assert.equal(mesesDisponibles('2026-11').length, 11)
  assert.equal(mesAnteriorDe('2026-01'), '2025-12')
  assert.equal(mesActualGt(new Date('2026-12-01T04:00:00Z')), '2026-11', 'a las 10 p. m. del 30/11 en Guatemala sigue siendo noviembre')
})
