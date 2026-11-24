// Pruebas de «¿Cumplimos lo programado?» en los 3 casos (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { resumenPublicaciones } from './redes.js'
import { respuestaProgramadas, respuestaPublicaciones } from './redesEjemplo.js'
import { armarProgramado, casoDelMes, itemsDelMes } from './redesProgramadas.js'

const pub = (id, marca, red, fecha, extra = {}) => ({ id, marca, pais: 'GT', red, formato: 'foto', fecha, titulo: id, alcance: 100, interacciones: 10, ...extra })
const HOY = '2026-11-23'

test('caso A: plan del mes contra lo publicado (± 1 día), no salieron, por venir y fuera del plan', () => {
  const datos = {
    publicaciones: [pub('p1', 'gt', 'fb', '2026-11-03'), pub('p2', 'gt', 'ig', '2026-11-10'), pub('extra', 'gt', 'fb', '2026-11-15')],
    plan: [{ id: 'a', marca: 'gt', red: 'fb', fecha: '2026-11-02', titulo: 'Plan A' }, { id: 'b', marca: 'gt', red: 'ig', fecha: '2026-11-10', titulo: 'Plan B' },
      { id: 'c', marca: 'gt', red: 'fb', fecha: '2026-11-07', titulo: 'Plan C' }, { id: 'd', marca: 'gt', red: 'fb', fecha: '2026-11-28', titulo: 'Plan D' }],
  }
  assert.equal(casoDelMes(datos, '2026-11'), 'A')
  const { items } = itemsDelMes(datos, '2026-11', HOY)
  const de = (id) => items.find((x) => x.id === id)
  assert.equal(de('p1').fueraDePlan, undefined, 'salió un día después: cuenta como cumplida')
  assert.equal(de('plan-c').estado, 'no_publicada')
  assert.equal(de('plan-d').estado, 'programada')
  assert.equal(de('extra').fueraDePlan, true)
  const r = resumenPublicaciones(items)
  assert.deepEqual([r.publicadas, r.cumplidas, r.noPublicadas, r.programadas, r.aFecha, r.cumplimiento], [3, 2, 1, 1, 3, 66.7])
})

test('caso B: programadas de Facebook (API); Instagram fuera del cumplimiento', () => {
  const datos = {
    publicaciones: [pub('f1', 'gt', 'fb', '2026-10-05', { programadaPara: '2026-10-05' }), pub('f2', 'gt', 'fb', '2026-10-06'), pub('i1', 'gt', 'ig', '2026-10-07')],
    programadas: [{ id: 'fbp-1', marca: 'gt', red: 'fb', fecha: '2026-10-09', titulo: 'Pendiente vencida' }],
    plan: [],
  }
  assert.equal(casoDelMes(datos, '2026-10'), 'B')
  const r = resumenPublicaciones(itemsDelMes(datos, '2026-10', HOY).items)
  assert.deepEqual([r.publicadas, r.cumplidas, r.noPublicadas, r.aFecha], [3, 1, 1, 2])
  const soloIg = resumenPublicaciones(itemsDelMes(datos, '2026-10', HOY).items.filter((x) => x.red === 'ig'))
  assert.equal(soloIg.semaforo, null, 'Instagram no tiene programadas: sin semáforo')
})

test('caso C: sin programadas, solo lo publicado y sin semáforo', () => {
  const datos = { publicaciones: [pub('x', 'gt', 'fb', '2026-09-03')], programadas: [], plan: [] }
  assert.equal(casoDelMes(datos, '2026-09'), 'C')
  const r = resumenPublicaciones(itemsDelMes(datos, '2026-09', HOY).items)
  assert.deepEqual([r.publicadas, r.aFecha, r.cumplimiento, r.semaforo], [1, 0, null, null])
})

test('datos de ejemplo: noviembre A, octubre B y septiembre C', () => {
  const { casos } = armarProgramado({ ...respuestaPublicaciones, ...respuestaProgramadas }, respuestaPublicaciones.hoy)
  assert.deepEqual(casos, { '2026-11': 'A', '2026-10': 'B', '2026-09': 'C' })
})
