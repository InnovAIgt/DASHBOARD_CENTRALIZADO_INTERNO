// Pruebas de los cálculos de Resumen y Publicaciones de Redes (datos inventados).
import assert from 'node:assert/strict'
import test from 'node:test'
import { calendarioMes, diaDeCorte, diaSemana, loImportante, mejorDia, mismoPeriodo, ordenarPublicaciones, pautaPorCampana, programadoVsPublicado, semaforoCosto, topPublicaciones, variacion } from './redesVista.js'

const p = (id, marca, fecha, estado, alcance = 0, interacciones = 0, formato = 'foto', red = 'fb') => ({ id, marca, pais: marca === 'gt' ? 'GT' : 'SV', red, formato, fecha, titulo: `T${id}`, estado, alcance, interacciones })
const ITEMS = [
  p('1', 'gt', '2026-11-02', 'publicada', 1000, 50), p('2', 'gt', '2026-11-03', 'no_publicada'), p('3', 'gt', '2026-11-28', 'programada'),
  p('4', 'sv', '2026-11-04', 'publicada', 800, 120, 'reel', 'ig'), p('5', 'sv', '2026-11-09', 'publicada', 500, 10),
]

test('corte y mismo período: solo si el mes está en curso', () => {
  assert.equal(diaDeCorte('2026-11', '2026-11-23'), 23)
  assert.equal(diaDeCorte('2026-10', '2026-11-23'), null)
  assert.deepEqual(mismoPeriodo([p('a', 'gt', '2026-10-05', 'publicada'), p('b', 'gt', '2026-10-28', 'publicada')], 23).map((x) => x.id), ['a'])
  assert.equal(Math.round(variacion(110, 100)), 10)
  assert.equal(variacion(5, 0), null)
})

test('calendario y mejor día: semanas desde el lunes y promedio de interacciones', () => {
  assert.equal(diaSemana('2026-11-02'), 0, '2 de noviembre de 2026 es lunes')
  const c = calendarioMes(ITEMS, '2026-11')
  assert.equal(c.vacios, 6, 'el 1 de noviembre de 2026 es domingo')
  assert.equal(c.dias.length, 30)
  assert.equal(c.dias[1].items[0].id, '1')
  const m = mejorDia(ITEMS)
  assert.equal(m.dias[2].nombre, 'Mié')
  assert.equal(m.mejor, 2, 'el miércoles 4 tuvo 120 interacciones')
})

test('programado vs publicado, top y lo importante', () => {
  const pv = programadoVsPublicado(ITEMS, ['gt', 'sv'])
  assert.deepEqual(pv.map((x) => [x.marca, x.programadas, x.publicadas]), [['gt', 2, 1], ['sv', 2, 2]])
  assert.deepEqual(topPublicaciones(ITEMS, 2).map((x) => x.id), ['4', '1'])
  const imp = loImportante(ITEMS, [], ['gt', 'sv'])
  assert.equal(imp[0].texto, 'RED GT: faltaron 1')
  assert.equal(imp.find((x) => x.tipo === 'formato').texto, 'Reels rinden 2.0×')
  assert.equal(imp.find((x) => x.tipo === 'top').texto, 'T4')
  assert.ok(!imp.some((x) => x.tipo === 'pauta'), 'sin campañas no hay píldora de pauta')
})

test('pauta: costo por mensaje con semáforo solo si la moneda tiene meta', () => {
  assert.equal(semaforoCosto(1.2, 'USD'), 'verde')
  assert.equal(semaforoCosto(2, 'USD'), 'amarillo')
  assert.equal(semaforoCosto(3, 'USD'), 'rojo')
  assert.equal(semaforoCosto(3, 'GTQ'), null, 'quetzales sin meta definida: sin color')
  const l = pautaPorCampana([{ id: 'a', moneda: 'USD', gastado: 30, mensajes: 10 }, { id: 'b', moneda: 'USD', gastado: 10, mensajes: 10 }, { id: 'c', moneda: 'USD', gastado: 5, mensajes: 0 }])
  assert.deepEqual(l.map((x) => x.id), ['b', 'a', 'c'], 'de la más barata a la más cara; sin mensajes al final')
  const imp = loImportante([], [{ id: 'a', moneda: 'USD', gastado: 30, mensajes: 10 }, { id: 'b', moneda: 'USD', gastado: 10, mensajes: 10 }])
  assert.equal(imp.find((x) => x.tipo === 'pauta').texto, '1 de 2 campañas sobre la meta')
})

test('ordenar la tabla por tasa y por fecha', () => {
  assert.deepEqual(ordenarPublicaciones(ITEMS, 'tasa', 'desc').slice(0, 2).map((x) => x.id), ['4', '1'])
  assert.deepEqual(ordenarPublicaciones(ITEMS, 'fecha', 'desc')[0].id, '3')
})
